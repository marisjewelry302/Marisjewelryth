param(
  [Parameter(Mandatory = $true)]
  [string]$RootPath,
  [int]$Port = 4173,
  [string]$HostName = "127.0.0.1"
)

$ErrorActionPreference = "Stop"

function Get-ContentType {
  param([string]$Extension)

  $types = @{
    ".css"          = "text/css; charset=utf-8"
    ".gif"          = "image/gif"
    ".htm"          = "text/html; charset=utf-8"
    ".html"         = "text/html; charset=utf-8"
    ".ico"          = "image/x-icon"
    ".jpg"          = "image/jpeg"
    ".jpeg"         = "image/jpeg"
    ".js"           = "application/javascript; charset=utf-8"
    ".json"         = "application/json; charset=utf-8"
    ".log"          = "text/plain; charset=utf-8"
    ".manifest"     = "text/cache-manifest; charset=utf-8"
    ".png"          = "image/png"
    ".robots"       = "text/plain; charset=utf-8"
    ".svg"          = "image/svg+xml"
    ".txt"          = "text/plain; charset=utf-8"
    ".webmanifest"  = "application/manifest+json; charset=utf-8"
    ".webp"         = "image/webp"
    ".xml"          = "application/xml; charset=utf-8"
  }

  if ($types.ContainsKey($Extension)) {
    return $types[$Extension]
  }

  return "application/octet-stream"
}

function Resolve-RequestPath {
  param(
    [Parameter(Mandatory = $true)][string]$ProjectRoot,
    [Parameter(Mandatory = $true)][string]$AbsolutePath
  )

  $relativePath = [Uri]::UnescapeDataString($AbsolutePath).TrimStart("/")
  $relativePath = $relativePath -replace "/", "\"

  if ([string]::IsNullOrWhiteSpace($relativePath)) {
    $relativePath = "index.html"
  }

  $candidate = [IO.Path]::GetFullPath((Join-Path $ProjectRoot $relativePath))

  if (-not $candidate.StartsWith($ProjectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $null
  }

  if (Test-Path -LiteralPath $candidate -PathType Container) {
    $candidate = Join-Path $candidate "index.html"
  }

  return $candidate
}

$projectRoot = [IO.Path]::GetFullPath($RootPath)
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://$HostName`:$Port/")
$listener.Start()

Write-Output "Serving $projectRoot at http://$HostName`:$Port/"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $response = $context.Response

    try {
      $resolvedPath = Resolve-RequestPath -ProjectRoot $projectRoot -AbsolutePath $context.Request.Url.AbsolutePath

      if (-not $resolvedPath) {
        $response.StatusCode = 403
        $body = [Text.Encoding]::UTF8.GetBytes("403 Forbidden")
        $response.ContentType = "text/plain; charset=utf-8"
        $response.OutputStream.Write($body, 0, $body.Length)
        continue
      }

      $statusCode = 200
      $filePath = $resolvedPath

      if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        $fallback404 = Join-Path $projectRoot "404.html"
        if (Test-Path -LiteralPath $fallback404 -PathType Leaf) {
          $statusCode = 404
          $filePath = $fallback404
        } else {
          $response.StatusCode = 404
          $body = [Text.Encoding]::UTF8.GetBytes("404 Not Found")
          $response.ContentType = "text/plain; charset=utf-8"
          $response.OutputStream.Write($body, 0, $body.Length)
          continue
        }
      }

      $bytes = [IO.File]::ReadAllBytes($filePath)
      $response.StatusCode = $statusCode
      $response.ContentType = Get-ContentType ([IO.Path]::GetExtension($filePath).ToLowerInvariant())
      $response.ContentLength64 = $bytes.Length
      $response.OutputStream.Write($bytes, 0, $bytes.Length)

      Write-Output ("{0} {1} -> {2}" -f $context.Request.HttpMethod, $context.Request.RawUrl, $response.StatusCode)
    } catch {
      $response.StatusCode = 500
      $body = [Text.Encoding]::UTF8.GetBytes("500 Internal Server Error")
      $response.ContentType = "text/plain; charset=utf-8"
      $response.OutputStream.Write($body, 0, $body.Length)
      Write-Error $_
    } finally {
      $response.OutputStream.Close()
      $response.Close()
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}

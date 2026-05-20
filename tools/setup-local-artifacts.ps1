param(
  [string]$RootPath = (Join-Path $env:LOCALAPPDATA "MarisJewelry\\artifacts"),
  [switch]$SessionOnly
)

$ErrorActionPreference = "Stop"

if (-not $env:LOCALAPPDATA) {
  throw "LOCALAPPDATA is not available in this shell."
}

function Ensure-Directory {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }

  return (Resolve-Path -LiteralPath $Path).Path
}

$root = Ensure-Directory -Path $RootPath

$paths = [ordered]@{
  MARIS_ARTIFACTS_ROOT      = $root
  MARIS_BROWSER_RUNTIME_DIR = Ensure-Directory -Path (Join-Path $root "browser-runtime")
  MARIS_SCREENSHOTS_DIR     = Ensure-Directory -Path (Join-Path $root "screenshots")
  MARIS_TEMP_PREVIEWS_DIR   = Ensure-Directory -Path (Join-Path $root "temp-previews")
  MARIS_LOGS_DIR            = Ensure-Directory -Path (Join-Path $root "logs")
}

foreach ($entry in $paths.GetEnumerator()) {
  Set-Item -Path "Env:$($entry.Key)" -Value $entry.Value

  if (-not $SessionOnly) {
    [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, "User")
  }
}

$scopeLabel = if ($SessionOnly) { "process only" } else { "process + user profile" }

Write-Output "Configured local artifact directories ($scopeLabel):"
$paths.GetEnumerator() |
  ForEach-Object {
    [pscustomobject]@{
      Name = $_.Key
      Path = $_.Value
    }
  } |
  Format-Table -AutoSize

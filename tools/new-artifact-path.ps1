[CmdletBinding()]
param(
  [ValidateSet("screenshot", "temp-preview", "log")]
  [string]$Kind = "screenshot",
  [string]$Name = "artifact",
  [string]$Subdirectory,
  [string]$Extension
)

$ErrorActionPreference = "Stop"

$setupScript = Join-Path $PSScriptRoot "setup-local-artifacts.ps1"
& $setupScript -SessionOnly | Out-Null

function Ensure-Directory {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }

  return (Resolve-Path -LiteralPath $Path).Path
}

$defaults = @{
  screenshot   = ".png"
  "temp-preview" = ".html"
  log          = ".log"
}

$baseDirectories = @{
  screenshot   = $env:MARIS_SCREENSHOTS_DIR
  "temp-preview" = $env:MARIS_TEMP_PREVIEWS_DIR
  log          = $env:MARIS_LOGS_DIR
}

$baseDirectory = $baseDirectories[$Kind]

if (-not $baseDirectory) {
  throw "No base directory is configured for kind '$Kind'."
}

if ($Subdirectory) {
  $baseDirectory = Join-Path $baseDirectory $Subdirectory
}

$targetDirectory = Ensure-Directory -Path $baseDirectory

$resolvedExtension = if ($Extension) { $Extension } else { $defaults[$Kind] }
if ($resolvedExtension -and -not $resolvedExtension.StartsWith(".")) {
  $resolvedExtension = ".$resolvedExtension"
}

$safeName = ($Name -replace '[^a-zA-Z0-9._-]+', '-').Trim('-')
if (-not $safeName) {
  $safeName = "artifact"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$fileName = "$safeName-$timestamp$resolvedExtension"
$fullPath = Join-Path $targetDirectory $fileName

Write-Output $fullPath

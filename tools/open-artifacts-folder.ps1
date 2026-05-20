[CmdletBinding()]
param(
  [ValidateSet("root", "screenshots", "temp-previews", "logs", "browser-runtime")]
  [string]$Target = "root"
)

$ErrorActionPreference = "Stop"

$setupScript = Join-Path $PSScriptRoot "setup-local-artifacts.ps1"
& $setupScript -SessionOnly | Out-Null

$paths = @{
  root            = $env:MARIS_ARTIFACTS_ROOT
  screenshots     = $env:MARIS_SCREENSHOTS_DIR
  "temp-previews" = $env:MARIS_TEMP_PREVIEWS_DIR
  logs            = $env:MARIS_LOGS_DIR
  "browser-runtime" = $env:MARIS_BROWSER_RUNTIME_DIR
}

$path = $paths[$Target]

if (-not $path) {
  throw "No path is configured for target '$Target'."
}

Start-Process explorer.exe $path
Write-Output $path

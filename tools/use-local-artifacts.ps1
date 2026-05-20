[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$setupScript = Join-Path $PSScriptRoot "setup-local-artifacts.ps1"

if (-not (Test-Path -LiteralPath $setupScript)) {
  throw "Missing setup script: $setupScript"
}

& $setupScript -SessionOnly

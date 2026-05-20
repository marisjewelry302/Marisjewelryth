[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$Url = "http://127.0.0.1:4173/",
  [ValidateSet("Auto", "Chrome", "Edge")]
  [string]$Browser = "Auto",
  [string]$ProfileName = "chrome-test-profile",
  [switch]$NewWindow
)

$ErrorActionPreference = "Stop"

$setupScript = Join-Path $PSScriptRoot "setup-local-artifacts.ps1"
$previousWhatIfPreference = $WhatIfPreference
$WhatIfPreference = $false
try {
  & $setupScript -SessionOnly | Out-Null
} finally {
  $WhatIfPreference = $previousWhatIfPreference
}

function Resolve-BrowserPath {
  param([string]$PreferredBrowser)

  $candidates = [ordered]@{
    Chrome = @(
      "C:\Program Files\Google\Chrome\Application\chrome.exe",
      "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    )
    Edge = @(
      "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
      "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    )
  }

  $searchOrder = if ($PreferredBrowser -eq "Auto") {
    @("Chrome", "Edge")
  } else {
    @($PreferredBrowser)
  }

  foreach ($name in $searchOrder) {
    foreach ($path in $candidates[$name]) {
      if (Test-Path -LiteralPath $path) {
        return [pscustomobject]@{
          Name = $name
          Path = $path
        }
      }
    }
  }

  throw "No supported browser was found. Install Chrome or Edge, or update the script paths."
}

function Ensure-Directory {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    if ($WhatIfPreference) {
      return [IO.Path]::GetFullPath($Path)
    }

    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }

  return (Resolve-Path -LiteralPath $Path).Path
}

$browserInfo = Resolve-BrowserPath -PreferredBrowser $Browser
$profileDir = Ensure-Directory -Path (Join-Path $env:MARIS_BROWSER_RUNTIME_DIR $ProfileName)
$arguments = @("--user-data-dir=$profileDir")

if ($NewWindow) {
  $arguments += "--new-window"
}

$arguments += $Url

if ($PSCmdlet.ShouldProcess("$($browserInfo.Name) at $Url", "Launch test browser")) {
  $process = Start-Process -FilePath $browserInfo.Path -ArgumentList $arguments -PassThru
  Write-Output "Opened $($browserInfo.Name)."
  Write-Output "URL: $Url"
  Write-Output "Profile: $profileDir"
  Write-Output "PID: $($process.Id)"
}

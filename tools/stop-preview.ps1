[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [int]$Port = 4173
)

$ErrorActionPreference = "Stop"

$previousWhatIfPreference = $WhatIfPreference
$WhatIfPreference = $false
try {
  $matches = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -like "powershell*" -and
    $_.CommandLine -like "*run-static-preview-server.ps1*" -and
    $_.CommandLine -like "*-Port $Port*"
  }
} finally {
  $WhatIfPreference = $previousWhatIfPreference
}

if (-not $matches) {
  Write-Output "No preview server process found for port $Port."
  return
}

foreach ($process in $matches) {
  if ($PSCmdlet.ShouldProcess("PID $($process.ProcessId)", "Stop preview server on port $Port")) {
    Stop-Process -Id $process.ProcessId -Force
    Write-Output "Stopped preview server PID $($process.ProcessId) on port $Port."
  }
}

[CmdletBinding()]
param(
  [int]$Port = 4173,
  [string]$HostName = "127.0.0.1"
)

$ErrorActionPreference = "Stop"

$setupScript = Join-Path $PSScriptRoot "setup-local-artifacts.ps1"
& $setupScript -SessionOnly | Out-Null

$url = "http://$HostName`:$Port/"
$stdoutLog = Join-Path $env:MARIS_LOGS_DIR "preview-$Port.stdout.log"
$stderrLog = Join-Path $env:MARIS_LOGS_DIR "preview-$Port.stderr.log"

$process = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -like "powershell*" -and
  $_.CommandLine -like "*run-static-preview-server.ps1*" -and
  $_.CommandLine -like "*-Port $Port*"
} | Select-Object -First 1

$reachable = Test-NetConnection -ComputerName $HostName -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
$httpStatus = $null
if ($reachable) {
  Start-Sleep -Milliseconds 200
  try {
    $httpStatus = (Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 3).StatusCode
  } catch {
    if ($_.Exception.Response) {
      $httpStatus = [int]$_.Exception.Response.StatusCode
    }
  }
}

[pscustomobject]@{
  Url       = $url
  Running   = [bool]$process
  Reachable = [bool]$reachable
  ProcessId = if ($process) { $process.ProcessId } else { $null }
  HttpStatus = $httpStatus
  StdoutLog = $stdoutLog
  StderrLog = $stderrLog
} | Format-List

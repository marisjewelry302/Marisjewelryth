[CmdletBinding()]
param(
  [int]$Port = 4173,
  [string]$HostName = "127.0.0.1",
  [switch]$Foreground
)

$ErrorActionPreference = "Stop"

$setupScript = Join-Path $PSScriptRoot "setup-local-artifacts.ps1"
& $setupScript -SessionOnly | Out-Null

$projectRoot = Split-Path -Parent $PSScriptRoot
$serverScript = Join-Path $PSScriptRoot "run-static-preview-server.ps1"
$powershellPath = Join-Path $PSHOME "powershell.exe"

$existingListener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
$url = "http://$HostName`:$Port/"

if ($existingListener) {
  Write-Output "Preview server is already listening on $url"
  Write-Output "PID: $($existingListener.OwningProcess)"
  return
}

if ($Foreground) {
  Write-Output "Starting preview server in the current shell at $url"
  & $serverScript -RootPath $projectRoot -Port $Port -HostName $HostName
  return
}

$stdoutLog = Join-Path $env:MARIS_LOGS_DIR "preview-$Port.stdout.log"
$stderrLog = Join-Path $env:MARIS_LOGS_DIR "preview-$Port.stderr.log"

$process = Start-Process `
  -FilePath $powershellPath `
  -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $serverScript, "-RootPath", $projectRoot, "-Port", "$Port", "-HostName", $HostName) `
  -WorkingDirectory $projectRoot `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -WindowStyle Hidden `
  -PassThru

for ($attempt = 0; $attempt -lt 12; $attempt++) {
  Start-Sleep -Milliseconds 250

  if ($process.HasExited) {
    throw "Preview server exited immediately. Check $stderrLog"
  }

  if (Test-NetConnection -ComputerName $HostName -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue) {
    break
  }
}

if ($process.HasExited) {
  throw "Preview server exited immediately. Check $stderrLog"
}

Write-Output "Preview server started."
Write-Output "URL: $url"
Write-Output "PID: $($process.Id)"
Write-Output "Stdout: $stdoutLog"
Write-Output "Stderr: $stderrLog"

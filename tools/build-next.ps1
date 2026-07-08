$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$NodeCandidates = @(
  "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe",
  "$env:LOCALAPPDATA\OpenAI\Codex\bin\node.exe"
)

$NodePath = $NodeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $NodePath) {
  $NodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if (-not $NodeCommand) {
    throw "Node.js was not found. Install Node.js 20.9+ or run this inside Codex with bundled dependencies."
  }
  $NodePath = $NodeCommand.Source
}

$NextCli = Join-Path $ProjectRoot "node_modules\next\dist\bin\next"
if (-not (Test-Path -LiteralPath $NextCli)) {
  throw "Next.js dependencies are missing. Run npm install first."
}

Push-Location $ProjectRoot
try {
  & $NodePath $NextCli build
}
finally {
  Pop-Location
}

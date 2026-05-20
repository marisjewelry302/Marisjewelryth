# Local Artifact Paths

This project keeps generated browser artifacts outside the repository so Codex and search tools do not get slowed down by large runtime folders, screenshots, or temp previews.

## Default location

On Windows, the setup script uses:

```text
%LOCALAPPDATA%\MarisJewelry\artifacts
```

That root contains:

- `browser-runtime`
- `screenshots`
- `temp-previews`
- `logs`

## One-time setup

Run this in PowerShell from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\setup-local-artifacts.ps1
```

The script creates the folders and sets persistent user environment variables:

- `MARIS_ARTIFACTS_ROOT`
- `MARIS_BROWSER_RUNTIME_DIR`
- `MARIS_SCREENSHOTS_DIR`
- `MARIS_TEMP_PREVIEWS_DIR`
- `MARIS_LOGS_DIR`

Open a new terminal after setup if you want those user-level variables to appear automatically in the next shell.

## Recommended usage

Save screenshots to:

```powershell
$env:MARIS_SCREENSHOTS_DIR
```

Save temp HTML previews or preview logs to:

```powershell
$env:MARIS_TEMP_PREVIEWS_DIR
```

When launching Chrome or Chromium for isolated test runs, point the user-data directory at:

```powershell
Join-Path $env:MARIS_BROWSER_RUNTIME_DIR "chrome-headless-test"
```

Example:

```powershell
chrome.exe --user-data-dir "$(Join-Path $env:MARIS_BROWSER_RUNTIME_DIR 'chrome-headless-test')"
```

## Helper scripts

Use local artifact variables in the current shell:

```powershell
.\tools\use-local-artifacts.ps1
```

Start a local preview server in the background:

```powershell
.\tools\start-preview.ps1
```

The preview helper uses a small PowerShell static server, so it does not require Python.

Start a preview server in the current shell instead:

```powershell
.\tools\start-preview.ps1 -Foreground
```

Open a test browser with its user-data directory outside the repo:

```powershell
.\tools\open-test-browser.ps1
```

Open a specific browser or URL:

```powershell
.\tools\open-test-browser.ps1 -Browser Edge -Url http://127.0.0.1:4173/pages/product.html
```

Create a timestamped output path for a screenshot, preview HTML file, or log:

```powershell
.\tools\new-artifact-path.ps1 -Kind screenshot -Name home-check
.\tools\new-artifact-path.ps1 -Kind temp-preview -Name rings-mobile
.\tools\new-artifact-path.ps1 -Kind log -Name preview-run
```

Open the external artifact folders in Explorer:

```powershell
.\tools\open-artifacts-folder.ps1
.\tools\open-artifacts-folder.ps1 -Target screenshots
```

Check whether the preview server is running:

```powershell
.\tools\preview-status.ps1
```

Stop the background preview server:

```powershell
.\tools\stop-preview.ps1
```

## Session-only mode

If you only want variables for the current shell session:

```powershell
. .\tools\setup-local-artifacts.ps1 -SessionOnly
```

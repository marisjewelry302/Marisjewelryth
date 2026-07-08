# Tools

Helper scripts for Next.js, local preview, browser testing, and artifact storage.

## Next.js workflow

- `start-next-dev.ps1`: runs the Next.js dev server with the bundled Node runtime when PATH is missing `node` or `npm`
- `build-next.ps1`: runs `next build` with the bundled Node runtime when PATH is missing `node` or `npm`
- `start-next-dev.cmd`: Windows launcher that bypasses local PowerShell execution-policy friction
- `build-next.cmd`: Windows launcher that bypasses local PowerShell execution-policy friction

## Artifact setup

- `setup-local-artifacts.ps1`: creates external artifact folders and stores persistent user environment variables
- `use-local-artifacts.ps1`: loads the same artifact variables into the current shell session
- `new-artifact-path.ps1`: returns a timestamped path for screenshots, temp previews, or logs
- `open-artifacts-folder.ps1`: opens the external artifact folders in Explorer

## Preview workflow

- `start-preview.ps1`: starts the local static preview server
- `preview-status.ps1`: reports whether the preview server is running and reachable
- `stop-preview.ps1`: stops the background preview server
- `run-static-preview-server.ps1`: internal PowerShell static server used by `start-preview.ps1`

## Browser workflow

- `open-test-browser.ps1`: opens Chrome or Edge with an isolated browser profile outside the repository

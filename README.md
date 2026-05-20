# Maris Jewelry

Static bilingual portfolio and catalogue site for Maris Jewelry.

## Project layout

```text
maris-jewelry/
|-- assets/                 Frontend CSS, JavaScript, and images
|-- pages/                  Secondary HTML pages
|-- tools/                  Local helper scripts for preview and artifact workflows
|-- docs/
|   |-- guides/             Working guides for local workflows
|   `-- archive/backups/    Manual backup files kept for reference
|-- nginx/                  Nginx config for Docker or Linux hosting
|-- index.html              Homepage
|-- 404.html                Static 404 page
|-- manifest.webmanifest    PWA manifest
|-- robots.txt              Search crawler rules
|-- sitemap.xml             Sitemap for deployment
|-- Dockerfile              Container image for static hosting
`-- DEPLOY.md               Deployment notes
```

## Local workflow

Start a local preview server:

```powershell
.\tools\start-preview.ps1
```

Open the preview in a clean test browser profile:

```powershell
.\tools\open-test-browser.ps1
```

Check preview status:

```powershell
.\tools\preview-status.ps1
```

Stop the preview server:

```powershell
.\tools\stop-preview.ps1
```

## Notes

- Generated screenshots, runtime folders, temp previews, and logs are stored outside the repository.
- Artifact workflow details live in `docs/guides/LOCAL_ARTIFACTS.md`.
- Documentation structure is summarized in `docs/README.md`.
- Helper script descriptions live in `tools/README.md`.

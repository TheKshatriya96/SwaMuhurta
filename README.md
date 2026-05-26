# MuhuratFinder V06 Dashboard

V06 is a static React dashboard. The live website does not recalculate astrology logic and does not need Python, Excel, a backend, a database, login, or paid hosting. It reads dashboard data from:

```text
web/public/data/muhurat-data.json
```

## Data Source

The default source workbook is:

```text
data_source/MuhuratFinder_V05_ParentStateEngine.xlsx
```

Refresh dashboard data:

```bash
python export_excel_to_json.py
```

Use another workbook when needed:

```bash
python export_excel_to_json.py --source "path/to/workbook.xlsx"
```

The exporter writes JSON to:

```text
web/public/data/
```

The live GitHub Pages site reads `muhurat-data.json` dynamically on page load. To update the online dashboard later, replace or regenerate `web/public/data/muhurat-data.json`, commit it, and push to `main`.

## Dashboard

Run the local dashboard:

```bash
cd web
npm run dev
```

Build the dashboard:

```bash
npm run build
```

Build locally with the same project-page base path that GitHub Actions uses:

```bash
$env:BASE_PATH="/YOUR_REPOSITORY_NAME/"
npm run build:pages
```

GitHub Actions sets `BASE_PATH` automatically to `/${{ github.event.repository.name }}/`, so you normally do not need to edit `vite.config.js`.

## GitHub Pages

After pushing this project to GitHub, enable Pages once:

1. Open the repository on GitHub.
2. Go to Settings > Pages.
3. Under Build and deployment, set Source to GitHub Actions.
4. Push to the `main` branch.

The live URL will be:

```text
https://<github-username>.github.io/<repo-name>/
```

Package V06:

```bash
python package_dashboard.py
```

The package is written to:

```text
release/MuhuratFinder_V06_Dashboard_Package.zip
```

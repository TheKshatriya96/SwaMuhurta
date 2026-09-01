# MuhuratFinder V06 Dashboard

V06 is now a self-contained dashboard package. Its runtime build flow no longer depends on sibling `v02`, `v03`, `v04`, or `v05` folders.

## Folder structure

```text
v06_Dashboard/
  build/
    MuhuratFinder_V06_Workbook.xlsx
    export_excel_to_json.py
    push_online.py
    run_all.py
    requirements.txt
    README_build.md
    dependencies/
  web/
  docs/
  README.md
```

## Main operator flow

Edit only:

`build/MuhuratFinder_V06_Workbook.xlsx`

First-time setup:

```powershell
setup_build_env.bat
```

Then regenerate dashboard data:

```powershell
build_data.bat
```

That command:

1. rebuilds raw EPHEMERIS data into the same workbook
2. reapplies parent-state/dashboard columns into the same workbook
3. exports JSON to `web/public/data/`
4. builds the frontend if `npm` is available

## JSON outputs

These files are refreshed by the exporter:

```text
web/public/data/config.json
web/public/data/day_summary.json
web/public/data/muhurat-data.json
web/public/data/windows.json
```

The React app reads `web/public/data/muhurat-data.json`.

## Local preview

```powershell
cd web
npm run dev
```

## Build the site

```powershell
cd web
npm run build
```

Or let the pipeline do it:

```powershell
build_data.bat
```

## Push online

Do not push by default. Use one of these only when ready:

```powershell
push_online.bat --message "Update dashboard data"
```

or

```powershell
build_and_push.bat --message "Update dashboard data"
```

This keeps the existing deployment flow:

`git add` -> `git commit` -> `git push` -> GitHub Actions builds `web/dist` -> GitHub Pages updates

## Compatibility

The old root command still works:

```powershell
python export_excel_to_json.py
```

It now forwards to `build/export_excel_to_json.py`.

## Troubleshooting

`swisseph` missing:

- run `setup_build_env.bat`
- the setup uses Python 3.11 and installs `build/requirements.txt` into `build/.venv`

Date range not changing:

- update the `CONFIG` sheet inside `build/MuhuratFinder_V06_Workbook.xlsx`
- save the workbook
- run `build_data.bat`

Need packaging notes:

- build-side documentation is in [build/README_build.md](build/README_build.md)
- cleanup report is in [docs/v06_dependency_cleanup_report.md](docs/v06_dependency_cleanup_report.md)

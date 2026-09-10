# MuhuratFinder V07 Dashboard

V07 is a clean, self-contained dashboard development version. Its runtime build flow does not depend on sibling `v02`, `v03`, `v04`, `v05`, or `v06_Dashboard` folders.

## Folder structure

```text
v07_Dashboard/
  build/
    MuhuratFinder_V07_Workbook.xlsx
    data/
      muhurta.db
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

`build/MuhuratFinder_V07_Workbook.xlsx`

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
3. writes SQLite master data to `build/data/muhurta.db`
4. exports GitHub Pages JSON to `web/public/data/` from SQLite
5. builds the frontend if `npm` is available

## Data outputs

Master generated data:

```text
build/data/muhurta.db
```

This SQLite database is the reusable data layer for future development. It contains indexed `windows`, `day_summary`, `config`, and `metadata` tables.

Static dashboard files are still refreshed for GitHub Pages:

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

- update the `CONFIG` sheet inside `build/MuhuratFinder_V07_Workbook.xlsx`
- save the workbook
- run `build_data.bat`

Need packaging notes:

- build-side documentation is in [build/README_build.md](build/README_build.md)
- independence report is in [docs/v07_independence_report.md](docs/v07_independence_report.md)

# MuhuratFinder V07 Dashboard

V07 is a clean, self-contained dashboard development version. Its runtime build flow does not depend on sibling `v02`, `v03`, `v04`, `v05`, or `v06_Dashboard` folders.

## Folder structure

```text
v07_Dashboard/
  build/
    MuhuratFinder_V07_Workbook.xlsx
    data/
      muhurta.db
      rules.db
    create_rules_db.py
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
2. writes raw SQLite data to `build/data/muhurta.db`
3. exports static raw data for GitHub Pages
4. builds the frontend if `npm` is available

Scoring is not recalculated by Excel or Python. The React dashboard loads
`rules.db` and applies all enabled rules in the browser.

## Data outputs

Master generated data:

```text
build/data/muhurta.db
```

This SQLite database is the reusable data layer for future development. It contains indexed `windows`, `day_summary`, `config`, and `metadata` tables.

Rule baseline:

```text
build/data/rules.db
web/public/data/rules.db
```

Open **Rule Lab** from the dashboard to change rule points, conditions,
thresholds, category labels, short codes, and colors. Changes update every
dashboard panel immediately. **Save to browser DB** stores a real SQLite binary
in the browser's IndexedDB. It survives reloads and data rebuilds on that
browser. Use **Export DB** and **Import DB** to move the same rules to another
browser or computer.

GitHub Pages is static hosting, so a browser cannot rewrite the repository's
hosted `rules.db`. The hosted file is an immutable baseline; operator edits are
kept in the browser copy. A writable shared online rule database would require
an API/backend in a future version.

Static dashboard files are still refreshed for GitHub Pages:

```text
web/public/data/config.json
web/public/data/day_summary.json
web/public/data/muhurat-data.json
web/public/data/windows.json
```

The React app reads `web/public/data/muhurat-data.json`.
Those JSON files contain raw display/ephemeris values only; they do not contain
the scoring rules.

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

Normal pushes protect already-tracked `build/data/rules.db` and
`web/public/data/rules.db`, so rebuilding local data does not replace the hosted
baseline. Only use this explicit option when you intentionally want to publish
a new baseline:

```powershell
python build/push_online.py --include-rules --message "Publish rule baseline"
```

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

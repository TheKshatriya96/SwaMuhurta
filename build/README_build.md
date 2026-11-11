# V07 Build Pipeline

This folder is the standalone build operator for V07.

## Main workbook

Edit only:

`build/MuhuratFinder_V07_Workbook.xlsx`

Use the `CONFIG` sheet to change date range, event location, and natal reference.
Rules and scoring are maintained in the dashboard Rule Lab, not in Excel.

## Build order

`run_all.py` performs this sequence:

1. validates local V07 paths
2. validates the workbook exists
3. rebuilds raw EPHEMERIS data into the same workbook
4. writes raw SQLite data into `build/data/muhurta.db`
5. exports static raw data into `web/public/data/`
6. validates SQLite and JSON files
7. optionally builds the frontend
8. optionally commits and pushes

## Scripts

`dependencies/v07_workbook_builder.py`

- raw/source-layer workbook rebuild
- uses only local `build/dependencies/muhurta_engine`

`export_excel_to_json.py`

- reads `build/MuhuratFinder_V07_Workbook.xlsx`
- writes the reusable SQLite database:
  - `build/data/muhurta.db`
- writes:
  - `web/public/data/config.json`
  - `web/public/data/day_summary.json`
  - `web/public/data/muhurat-data.json`
  - `web/public/data/windows.json`
- does not read or export Excel score/formula columns

`create_rules_db.py`

- one-time creator for `build/data/rules.db`
- copies the baseline to `web/public/data/rules.db`
- refuses to overwrite either database unless `--force` is supplied
- is not called by the normal data generation pipeline

`run_all.py`

- main operator script

`push_online.py`

- runs the existing `git add` -> `git commit` -> `git push` flow
- protects tracked `rules.db` baseline files by default
- accepts `--include-rules` only for an intentional baseline release
- GitHub Actions then rebuilds and deploys GitHub Pages

## Typical commands

Create/update the local Python 3.11 environment:

```powershell
setup_build_env.bat
```

Generate workbook + JSON + local web build:

```powershell
build_data.bat
```

Generate workbook + JSON only:

```powershell
build_data.bat --skip-web-build
```

Generate and push online:

```powershell
build_and_push.bat --message "Update muhurat data"
```

Push already-generated changes:

```powershell
push_online.bat --message "Update muhurat data"
```

## Common errors

`Missing dependency: swisseph`

- run `setup_build_env.bat`
- confirm Python 3.11 is available through `py -3.11`

`rules.db returned 404`

- confirm `web/public/data/rules.db` exists
- run `python build/create_rules_db.py` only when establishing the first baseline

`npm not found`

- JSON export still works
- install Node.js only if you want local web builds from this machine

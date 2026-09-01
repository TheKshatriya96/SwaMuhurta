# V06 Build Pipeline

This folder is the standalone build operator for V06.

## Main workbook

Edit only:

`build/MuhuratFinder_V06_Workbook.xlsx`

Use the `CONFIG` sheet to change date range, event location, natal reference, and any workbook-side logic already present there.

## Build order

`run_all.py` performs this sequence:

1. validates local V06 paths
2. validates the workbook exists
3. rebuilds raw EPHEMERIS data into the same workbook
4. reapplies parent-state columns into the same workbook
5. exports JSON into `web/public/data/`
6. validates JSON files
7. optionally builds the frontend
8. optionally commits and pushes

## Scripts

`dependencies/v06_workbook_builder.py`

- raw/source-layer workbook rebuild
- uses only local `build/dependencies/muhurta_engine`

`dependencies/v06_parent_state_engine.py`

- adds the parent-state/dashboard columns into the same workbook

`export_excel_to_json.py`

- reads `build/MuhuratFinder_V06_Workbook.xlsx`
- writes:
  - `web/public/data/config.json`
  - `web/public/data/day_summary.json`
  - `web/public/data/muhurat-data.json`
  - `web/public/data/windows.json`

`run_all.py`

- main operator script

`push_online.py`

- runs the existing `git add` -> `git commit` -> `git push` flow
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

`Required parent-state columns were not found`

- run `build/run_all.py` so the in-place parent-state pass runs before export

`npm not found`

- JSON export still works
- install Node.js only if you want local web builds from this machine

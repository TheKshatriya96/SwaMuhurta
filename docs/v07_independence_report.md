# V07 Independence Report

V07 was created as a fresh, standalone development copy of the V06 dashboard.

## Internal runtime paths

| Purpose | V07 path |
|---|---|
| Main editable workbook | `build/MuhuratFinder_V07_Workbook.xlsx` |
| Full runner | `build/run_all.py` |
| Excel to JSON exporter | `build/export_excel_to_json.py` |
| GitHub push wrapper | `build/push_online.py` |
| Raw workbook builder | `build/dependencies/v07_workbook_builder.py` |
| Parent-state engine | `build/dependencies/v07_parent_state_engine.py` |
| Local muhurta engine package | `build/dependencies/muhurta_engine/` |
| Dashboard app | `web/` |
| Dashboard data | `web/public/data/` |

## Removed from V07 copy

- `web/node_modules/`
- `web/dist/`
- `build/.venv/`
- `__pycache__/`
- `.tmp/`
- `release/`
- old `data_source/`
- old package zip builder
- old V06 build spec

## External dependency check

Runtime scripts are designed to resolve paths relative to `v07_Dashboard`.

The normal flow is:

`edit build/MuhuratFinder_V07_Workbook.xlsx -> python build/run_all.py -> web/public/data/*.json -> optional push`

## GitHub publishing

The copied `.git` and `.github` folders keep the same remote and GitHub Pages workflow:

`https://github.com/TheKshatriya96/SwaMuhurta.git`

Pushing from V07 still updates the same online dashboard repository.

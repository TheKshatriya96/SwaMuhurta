# V06 Dependency Cleanup Report

## Goal

Make `v06_Dashboard` self-contained so runtime build scripts no longer depend on sibling folders like `v02`, `v03`, `v04`, or `v05`.

## Runtime dependencies found and migrated

| File | Old reference | New internal path | Status |
|---|---|---|---|
| `export_excel_to_json.py` | `../v05/output/MuhuratFinder_V05_ParentStateEngine_FIXED.xlsx` | `build/MuhuratFinder_V06_Workbook.xlsx` | Migrated |
| `build/dependencies/v06_workbook_builder.py` | `../v03/Build/muhurta_engine` import path | `build/dependencies/muhurta_engine` | Migrated |
| `build/dependencies/v06_workbook_builder.py` | `../v04/output/...` and `../v03/...` config fallback | local workbook only | Migrated |
| `build/dependencies/v06_parent_state_engine.py` | `v05/output/...` second workbook output flow | in-place save to `build/MuhuratFinder_V06_Workbook.xlsx` | Migrated |
| `web/public/data/config.json` | `..\v05\output\...` source workbook label | regenerated from `build/MuhuratFinder_V06_Workbook.xlsx` | Migrated |

## Non-runtime historical references still present

| File | Reference | Why kept | Status |
|---|---|---|---|
| `V06_DASHBOARD_SPEC.md` | V05 workbook path | historical build spec | Manual review only |
| older root docs / notes | V05 wording | documentation history | Manual review only |

## Files copied into V06

| Source | Copied to |
|---|---|
| `v03/Build/muhurta_engine/` | `v06_Dashboard/build/dependencies/muhurta_engine/` |
| `v05/output/MuhuratFinder_V05_ParentStateEngine_FIXED.xlsx` | `v06_Dashboard/build/MuhuratFinder_V06_Workbook.xlsx` |
| `v05/v05_working_base_builder.py` | adapted into `v06_Dashboard/build/dependencies/v06_workbook_builder.py` |
| `v05/v05_parent_state_engine.py` | adapted into `v06_Dashboard/build/dependencies/v06_parent_state_engine.py` |

## Validation target

The runtime build path is now:

`edit workbook -> build_data.bat -> web/public/data/*.json -> optional git push`

## Verification completed

- `build_data.bat` completed using the local Python 3.11 `build/.venv`.
- Excel recalculated and cached all parent-state formulas.
- `14,001` windows and `94` day summaries were exported.
- `config.json`, `day_summary.json`, `muhurat-data.json`, and `windows.json` retained their existing structural schema fingerprints.
- `npm run build` completed successfully.
- The Vite development server returned HTTP 200 for both the dashboard and `data/muhurat-data.json`.
- The served payload contained `14,001` windows and `94` day summaries.
- Runtime Python scripts contain no relative or absolute references to sibling `v02`, `v03`, `v04`, or `v05` folders.
- `push_online.py --dry-run` detected changes without committing or pushing.

## Remaining manual review items

- If you want every historical V05 mention removed from non-runtime docs/specs, those can be cleaned in a second pass.
- `web/dist/` is still a generated artifact, not a source dependency.
- The first machine setup must run `setup_build_env.bat`; Microsoft Excel is required for formula recalculation.

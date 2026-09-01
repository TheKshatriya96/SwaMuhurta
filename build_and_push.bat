@echo off
setlocal
set "PYTHON=build\.venv\Scripts\python.exe"
if not exist "%PYTHON%" (
  echo Build environment missing. Run setup_build_env.bat first.
  exit /b 1
)
"%PYTHON%" build\run_all.py --push %*

@echo off
setlocal

where py >nul 2>nul
if errorlevel 1 (
  echo Python launcher not found. Install Python 3.11, then rerun this script.
  exit /b 1
)

py -3.11 -c "import sys; print(sys.version)" >nul 2>nul
if errorlevel 1 (
  echo Python 3.11 is not installed. Install it, then rerun this script.
  exit /b 1
)

if not exist "build\.venv\Scripts\python.exe" (
  py -3.11 -m venv build\.venv
  if errorlevel 1 exit /b 1
)

"build\.venv\Scripts\python.exe" -m pip install --upgrade pip setuptools wheel
if errorlevel 1 exit /b 1

"build\.venv\Scripts\python.exe" -m pip install -r build\requirements.txt
if errorlevel 1 exit /b 1

echo Build environment ready.

# Build a one-file Desktop Pet binary on Windows.
# Usage: powershell -ExecutionPolicy Bypass -File pet\packaging\build-windows.ps1
# Output: dist\desktop-pet.exe plus dist\SHA256SUMS.txt
$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $root

$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) {
  Write-Error "python (3.10 or newer) is required on PATH"
  exit 1
}
python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)"
if ($LASTEXITCODE -ne 0) {
  Write-Error "Python 3.10 or newer is required"
  exit 1
}

python -c "import PyInstaller" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "[pet] installing pyinstaller into this Python..."
  python -m pip install --quiet pyinstaller
}

python -m PyInstaller --clean --noconfirm pet/packaging/desktop-pet.spec

$bin = Join-Path $root "dist\desktop-pet.exe"
if (-not (Test-Path $bin)) {
  # PyInstaller names the file after the spec `name` without .exe on
  # some setups; normalize so every OS documents the same artifact.
  $alt = Join-Path $root "dist\desktop-pet"
  if (Test-Path $alt) { Rename-Item $alt $bin }
}
if (-not (Test-Path $bin)) {
  Write-Error "expected dist\desktop-pet.exe was not produced"
  exit 1
}

$hash = (Get-FileHash $bin -Algorithm SHA256).Hash.ToLower()
"$hash  desktop-pet.exe" | Out-File -Encoding ascii (Join-Path $root "dist\SHA256SUMS.txt")

& $bin selftest | Out-Null
Write-Host "[pet] selftest passed on the bundle"
Write-Host "[pet] built $bin"
Get-ChildItem (Join-Path $root "dist")

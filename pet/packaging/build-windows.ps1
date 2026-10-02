# Build a one-file Desktop Pet binary on Windows, then compile the
# Inno Setup installer when iscc is available.
# Usage: powershell -ExecutionPolicy Bypass -File pet\packaging\build-windows.ps1
# Version is single-sourced from pet/__init__.py: do not literal it here.
# Output: dist\desktop-pet.exe (plus dist\desktop-pet-setup-<version>.exe
#         when Inno Setup 6 is installed) plus dist\SHA256SUMS.txt
$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $root

$version = (python -m pet version --porcelain).Trim()
if (-not $version) {
  Write-Error "could not derive VERSION from pet/__init__.py"
  exit 1
}
Write-Host "[pet] version $version"

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
if ($LASTEXITCODE -ne 0) {
  Write-Error "bundle selftest failed"
  exit 1
}
Write-Host "[pet] selftest passed on the bundle"
Write-Host "[pet] built $bin"

$iscc = Get-Command iscc -ErrorAction SilentlyContinue
if ($iscc) {
  Write-Host "[pet] compiling Inno Setup installer..."
  & iscc "/DMyAppVersion=$version" (Join-Path $root "pet\packaging\desktop-pet.iss")
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Inno Setup compile failed"
    exit 1
  }
  $setup = Join-Path $root "dist\desktop-pet-setup-$version.exe"
  if (-not (Test-Path $setup)) {
    Write-Error "expected $setup was not produced"
    exit 1
  }
  $setupHash = (Get-FileHash $setup -Algorithm SHA256).Hash.ToLower()
  "$setupHash  desktop-pet-setup-$version.exe" | Out-File -Append -Encoding ascii (Join-Path $root "dist\SHA256SUMS.txt")
  Write-Host "[pet] built $setup"
} else {
  Write-Host "[pet] iscc not found, skipping setup exe (binary is built)"
  Write-Host "[pet] to build it: install Inno Setup 6 and rerun this script"
}
Get-ChildItem (Join-Path $root "dist")

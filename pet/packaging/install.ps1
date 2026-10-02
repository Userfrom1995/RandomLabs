# Install Desktop Pet from source on Windows (run-from-source path).
# Verifies Python 3.10+ (plus tkinter), runs selftest, then enables
# launch-at-login through the pet's own startup command.
# Usage: powershell -ExecutionPolicy Bypass -File pet\packaging\install.ps1 [-Service] [-Character ID]
param(
  [switch]$Service,
  [string]$Character = ""
)
$ErrorActionPreference = "Stop"

try { $version = python --version 2>&1 } catch {
  Write-Error "python is required (3.10 or newer) and must be on PATH"
}
Write-Host "[pet] found $version"

python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)"
if ($LASTEXITCODE -ne 0) { Write-Error "Python 3.10 or newer is required" }

python -c "import tkinter" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "[pet] note: tkinter is missing, only headless commands will work"
}

Push-Location (Join-Path $PSScriptRoot "..\..")
try {
  python -m pet selftest
  if ($LASTEXITCODE -ne 0) { Write-Error "pet selftest failed, refusing to install" }
  Write-Host "[pet] selftest passed"
  if ($Character -ne "") {
    python -m pet characters switch $Character
    if ($LASTEXITCODE -ne 0) { Write-Error "unknown character '$Character'" }
  }
  if ($Service) { python -m pet startup on --service }
  else { python -m pet startup on }
  Write-Host "[pet] installed: launch-at-login is on. Run 'python -m pet gui' to play."
} finally {
  Pop-Location
}

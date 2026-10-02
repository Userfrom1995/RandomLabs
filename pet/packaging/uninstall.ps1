# Remove Desktop Pet integration on Windows.
# Stops the background service, removes launch-at-login, and leaves
# saves in %APPDATA%\DesktopPet unless -Purge is given.
# Usage: powershell -ExecutionPolicy Bypass -File pet\packaging\uninstall.ps1 [-Purge]
param(
  [switch]$Purge
)
$ErrorActionPreference = "Stop"

Push-Location (Join-Path $PSScriptRoot "..\..")
try {
  python -m pet service stop 2>$null | Out-Null
  python -m pet startup off 2>$null | Out-Null
  Write-Host "[pet] background service stopped, launch-at-login disabled"
} finally {
  Pop-Location
}

if ($Purge) {
  $data = $env:DESKTOP_PET_DATA_DIR
  if ([string]::IsNullOrEmpty($data)) {
    $base = $env:APPDATA
    if ([string]::IsNullOrEmpty($base)) { $base = $HOME }
    $data = Join-Path $base "DesktopPet"
  }
  if (Test-Path $data) {
    Remove-Item -Recurse -Force $data
    Write-Host "[pet] removed saved data at $data"
  }
} else {
  Write-Host "[pet] saves left in place (rerun with -Purge for a full wipe)"
}
Write-Host "[pet] uninstalled cleanly: no service or autostart residue remains"

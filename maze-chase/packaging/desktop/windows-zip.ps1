# Build the Windows desktop release and zip it for distribution.
#
# Run on a Windows runner (or a Windows dev machine) from the repo root:
#   powershell -ExecutionPolicy Bypass -File maze-chase/packaging/desktop/windows-zip.ps1
#
# Output: dist/maze-chase-desktop-<version>-windows-x86_64.zip with the
# .exe plus the launch guide. The desktop game has no DLL dependencies
# beyond the Windows runtime that ships with supported systems.
$ErrorActionPreference = "Stop"
. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\common.ps1")

$stage = Join-Path $Dist "stage-win"
New-Item -ItemType Directory -Force -Path $Dist | Out-Null
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

cargo build --release -p maze-chase-desktop --manifest-path (Join-Path $Root "Cargo.toml")
if ($LASTEXITCODE -ne 0) {
    throw "cargo build failed with exit code $LASTEXITCODE"
}

$exe = Join-Path $Root "target\release\maze-chase-desktop.exe"
if (-not (Test-Path $exe)) {
    throw "missing release binary: $exe"
}
Copy-Item $exe $stage
Copy-Item (Join-Path $Root "docs\desktop.md") (Join-Path $stage "README-desktop.md")

$zip = Join-Path $Dist "maze-chase-desktop-$Version-windows-x86_64.zip"
New-ReproducibleZip -Stage $stage -Out $zip
& (Join-Path $stage "maze-chase-desktop.exe") --version
if ($LASTEXITCODE -ne 0) {
    throw "the staged binary --version probe failed with exit code $LASTEXITCODE"
}

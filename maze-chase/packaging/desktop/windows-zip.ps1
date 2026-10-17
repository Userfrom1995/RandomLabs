# Build the Windows desktop release and zip it for distribution.
#
# Run on a Windows runner (or a Windows dev machine) from the repo root:
#   powershell -ExecutionPolicy Bypass -File maze-chase/packaging/desktop/windows-zip.ps1
#
# Output: dist/maze-chase-desktop-<version>-windows-x86_64.zip containing
# the .exe plus the launch docs. No system dependencies: rodio uses
# WASAPI and winit uses the system Win32 APIs, both without extra installs.
$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path (Join-Path $here "..\\..")).Path
$version = (Select-String '^version' (Join-Path $root "crates\\desktop\\Cargo.toml") | Select-Object -First 1).Line.Split('"')[1]
$dist = Join-Path $root "dist"
$stage = Join-Path $dist "stage-win"

cargo build --release -p maze-chase-desktop --manifest-path (Join-Path $root "Cargo.toml")
if ($LASTEXITCODE -ne 0) {
  throw "cargo build failed with exit code $LASTEXITCODE"
}

Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
New-Item -ItemType Directory $stage | Out-Null
$exe = Join-Path $root "target\\release\\maze-chase-desktop.exe"
if (-not (Test-Path $exe)) {
  $exe = Join-Path $root "..\\target\\release\\maze-chase-desktop.exe"
}
Copy-Item $exe $stage
Copy-Item (Join-Path $root "docs\\desktop.md") (Join-Path $stage "README-desktop.md")

$zip = Join-Path $dist "maze-chase-desktop-$version-windows-x86_64.zip"
Remove-Item $zip -ErrorAction SilentlyContinue
Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zip
Write-Host "staged: $zip"
& (Join-Path $stage "maze-chase-desktop.exe") --version
if ($LASTEXITCODE -ne 0) {
  throw "the staged binary --version probe failed with exit code $LASTEXITCODE"
}

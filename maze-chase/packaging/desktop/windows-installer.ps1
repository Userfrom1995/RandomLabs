# Build the Windows desktop game plus its Inno Setup installer.
#
# Run on Windows with Inno Setup 6 installed:
#   powershell -ExecutionPolicy Bypass -File maze-chase/packaging/desktop/windows-installer.ps1
#
# Outputs:
#   dist/maze-chase-desktop-<version>-windows-x86_64.zip
#   dist/maze-chase-desktop-<version>-windows-x86_64-setup.exe
#
# The release pipeline installs Inno Setup with
# `choco install innosetup -y --no-progress`. A developer machine can
# install it from jrsoftware.org; the script fails loudly when iscc is
# absent instead of shipping an installer-less release.
$ErrorActionPreference = "Stop"
. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\common.ps1")

$stage = Join-Path $Dist "stage-win"
New-Item -ItemType Directory -Force -Path $Dist | Out-Null
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

cargo build --release --locked -p maze-chase-desktop --manifest-path (Join-Path $Root "Cargo.toml")
if ($LASTEXITCODE -ne 0) {
    throw "cargo build failed with exit code $LASTEXITCODE"
}
$exe = Join-Path $Root "target\release\maze-chase-desktop.exe"
if (-not (Test-Path $exe)) {
    throw "missing release binary: $exe"
}
Assert-StaticCrt @($exe)
Copy-Item $exe $stage
Copy-Item (Join-Path $Root "docs\desktop.md") (Join-Path $stage "README-desktop.md")
Copy-Item (Join-Path $RepoRoot "LICENSE") (Join-Path $stage "LICENSE")

$zip = Join-Path $Dist "maze-chase-desktop-$Version-windows-x86_64.zip"
New-ReproducibleZip -Stage $stage -Out $zip

$isccCandidates = @()
$onPath = Get-Command iscc.exe -ErrorAction SilentlyContinue
if ($onPath) { $isccCandidates += $onPath.Source }
$isccCandidates += @(
    (Join-Path $env:LOCALAPPDATA "Programs\Inno Setup 6\ISCC.exe"),
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe"
)
$iscc = $isccCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $iscc) {
    throw 'Inno Setup (iscc.exe) not found; install it with: choco install innosetup -y --no-progress'
}

$iss = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "windows-installer.iss"
& $iscc "/DMyAppVersion=$Version" "/DMySourceDir=$stage" "/O$Dist" $iss
if ($LASTEXITCODE -ne 0) {
    throw "iscc failed with exit code $LASTEXITCODE"
}

$setup = Join-Path $Dist "maze-chase-desktop-$Version-windows-x86_64-setup.exe"
if (-not (Test-Path $setup)) {
    throw "installer was not produced: $setup"
}
Write-Host "staged: $setup"
Write-Host "sha256: $(Get-Sha256 $setup)"

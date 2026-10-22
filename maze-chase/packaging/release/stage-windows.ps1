# Build, package, smoke, and checksum every Windows release artifact.
#
#   powershell -ExecutionPolicy Bypass -File maze-chase/packaging/release/stage-windows.ps1 [-Install] [-Probe]
#
# Outputs in maze-chase/dist/:
#   maze-chase-terminal-<version>-windows-x86_64.zip
#   maze-chase-desktop-<version>-windows-x86_64.zip
#   maze-chase-desktop-<version>-windows-x86_64-setup.exe
#   SHA256SUMS.txt
#
# -Install runs the setup silently into a scratch directory, launches
# the installed binary, uninstalls, and proves the files are gone.
# -Probe additionally drives a real windowed frame.
$ErrorActionPreference = "Stop"
. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\common.ps1")

$install = $false
$probe = $false
foreach ($arg in $args) {
    switch ($arg) {
        "-Install" { $install = $true }
        "-Probe" { $probe = $true }
        default { throw "unknown argument: $arg" }
    }
}

$pkg = Join-Path $Root "packaging"
& powershell -ExecutionPolicy Bypass -File (Join-Path $pkg "terminal\windows-zip.ps1")
if ($LASTEXITCODE -ne 0) { throw "terminal zip failed with $LASTEXITCODE" }
& powershell -ExecutionPolicy Bypass -File (Join-Path $pkg "desktop\windows-installer.ps1")
if ($LASTEXITCODE -ne 0) { throw "desktop installer failed with $LASTEXITCODE" }

$terminalZip = Join-Path $Dist "maze-chase-terminal-$Version-windows-x86_64.zip"
$desktopZip = Join-Path $Dist "maze-chase-desktop-$Version-windows-x86_64.zip"
$installer = Join-Path $Dist "maze-chase-desktop-$Version-windows-x86_64-setup.exe"
foreach ($artifact in @($terminalZip, $desktopZip, $installer)) {
    if (-not (Test-Path $artifact)) { throw "missing staged artifact: $artifact" }
}

$smokeArgs = @(
    "-Zip", $terminalZip,
    "-Zip", $desktopZip,
    "-Installer", $installer
)
if ($install) { $smokeArgs += "-Install" }
if ($probe) { $smokeArgs += "-Probe" }
& powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "smoke-windows.ps1") @smokeArgs
if ($LASTEXITCODE -ne 0) { throw "windows smoke failed with $LASTEXITCODE" }

Write-Checksums -Directory $Dist -Files @(
    (Split-Path -Leaf $terminalZip),
    (Split-Path -Leaf $desktopZip),
    (Split-Path -Leaf $installer)
)

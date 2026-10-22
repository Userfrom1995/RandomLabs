# Verify Windows package payloads on the machine that built them.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File maze-chase/packaging/release/smoke-windows.ps1 `
#     [-Zip dist\maze-chase-terminal-...zip] [-Zip dist\maze-chase-desktop-...zip] `
#     [-Installer dist\maze-chase-desktop-...-setup.exe] [-Install] [-Probe]
#
# Logic checks (zip layout, extracted --version, installer filename and
# version) always run. -Install additionally installs the desktop setup
# silently into a scratch directory, launches it, uninstalls it, and
# proves the files are gone. -Probe drives a real windowed frame through
# `--probe 1` (requires an interactive desktop session).
$ErrorActionPreference = "Stop"
. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\common.ps1")

$Zips = @()
$Installer = ""
$Install = $false
$Probe = $false
for ($i = 0; $i -lt $args.Count; $i++) {
    switch ($args[$i]) {
        "-Zip" { $i++; $Zips += $args[$i] }
        "-Installer" { $i++; $Installer = $args[$i] }
        "-Install" { $Install = $true }
        "-Probe" { $Probe = $true }
        default { throw "unknown argument: $($args[$i])" }
    }
}

if ($Zips.Count -eq 0 -and -not $Installer) {
    throw "nothing to smoke (pass -Zip and/or -Installer)"
}

$work = Join-Path ([System.IO.Path]::GetTempPath()) ("maze-chase-smoke-" + [guid]::NewGuid())
New-Item -ItemType Directory -Force -Path $work | Out-Null
try {
    foreach ($zip in $Zips) {
        if (-not (Test-Path $zip)) { throw "missing zip $zip" }
        $name = if ($zip -match "terminal") { "terminal" } else { "desktop" }
        $dest = Join-Path $work "zip-$name"
        Expand-Archive -Path $zip -DestinationPath $dest
        $exe = Join-Path $dest "maze-chase-$name.exe"
        if (-not (Test-Path $exe)) { throw "$zip does not contain maze-chase-$name.exe" }
        if (-not (Test-Path (Join-Path $dest "LICENSE"))) {
            throw "$zip does not contain LICENSE"
        }
        $version = (& $exe --version 2>&1 | Out-String).Trim()
        if ($version -notmatch [regex]::Escape($Version)) {
            throw "$zip reports '$version', expected version $Version"
        }
        & $exe --help | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "$zip --help failed with $LASTEXITCODE" }
        if ($Probe -and $name -eq "desktop") {
            $shot = Join-Path $work "probe.ppm"
            & $exe --no-pad --probe 1 $shot
            if ($LASTEXITCODE -ne 0) { throw "$zip probe failed with $LASTEXITCODE" }
            if (-not (Test-Path $shot) -or (Get-Item $shot).Length -eq 0) {
                throw "$zip probe wrote no screenshot"
            }
        }
        Write-Host "smoke: ok $zip"
    }

    if ($Installer) {
        if (-not (Test-Path $Installer)) { throw "missing installer $Installer" }
        if ($Installer -notmatch [regex]::Escape($Version)) {
            throw "installer filename does not carry version $Version"
        }
        if ($Install) {
            $target = Join-Path $work "installed"
            $installLog = Join-Path $work "install.log"
            $uninstallLog = Join-Path $work "uninstall.log"
            $proc = Start-Process -FilePath $Installer -Wait -PassThru -ArgumentList @(
                "/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART",
                "/DIR=$target", "/LOG=$installLog"
            )
            if ($proc.ExitCode -ne 0) {
                throw "installer failed with exit code $($proc.ExitCode); see $installLog"
            }
            $installedExe = Join-Path $target "maze-chase-desktop.exe"
            if (-not (Test-Path $installedExe)) { throw "installer did not place the exe" }
            if (-not (Test-Path (Join-Path $target "LICENSE"))) {
                throw "installer did not place LICENSE"
            }
            $version = (& $installedExe --version 2>&1 | Out-String).Trim()
            if ($version -notmatch [regex]::Escape($Version)) {
                throw "installed binary reports '$version', expected $Version"
            }
            $uninstaller = Join-Path $target "unins000.exe"
            if (-not (Test-Path $uninstaller)) { throw "installer did not register an uninstaller" }
            $proc = Start-Process -FilePath $uninstaller -Wait -PassThru -ArgumentList @(
                "/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART", "/LOG=$uninstallLog"
            )
            if ($proc.ExitCode -ne 0) {
                throw "uninstaller failed with exit code $($proc.ExitCode); see $uninstallLog"
            }
            if (Test-Path $installedExe) { throw "uninstaller left the exe behind" }
            Write-Host "smoke: install and uninstall round trip ok"
        }
        Write-Host "smoke: ok $Installer"
    }
}
finally {
    Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue
}

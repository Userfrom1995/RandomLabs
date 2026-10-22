# Build the terminal game on Windows and stage a distributable zip.
#
# Run on Windows from the repo root:
#   powershell -ExecutionPolicy Bypass -File maze-chase/packaging/terminal/windows-zip.ps1
#
# Output: dist/maze-chase-terminal-<version>-windows-x86_64.zip with the
# .exe, the launch guide, and the license. The binary links the static
# MSVC runtime (common.ps1 sets +crt-static), so the zip needs no VC++
# redistributable on the target machine.
$ErrorActionPreference = "Stop"
. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\common.ps1")

$stage = Join-Path $Dist "stage-terminal-win"
New-Item -ItemType Directory -Force -Path $Dist | Out-Null
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

cargo build --release -p maze-chase-terminal --manifest-path (Join-Path $Root "Cargo.toml")
if ($LASTEXITCODE -ne 0) {
    throw "cargo build failed with exit code $LASTEXITCODE"
}

$exe = Join-Path $Root "target\release\maze-chase-terminal.exe"
if (-not (Test-Path $exe)) {
    throw "missing release binary: $exe"
}
Assert-StaticCrt @($exe)
Copy-Item $exe $stage
Copy-Item (Join-Path $Root "docs\terminal.md") (Join-Path $stage "README-terminal.md")
Copy-Item (Join-Path $RepoRoot "LICENSE") (Join-Path $stage "LICENSE")

$zip = Join-Path $Dist "maze-chase-terminal-$Version-windows-x86_64.zip"
New-ReproducibleZip -Stage $stage -Out $zip
& (Join-Path $stage "maze-chase-terminal.exe") --version
if ($LASTEXITCODE -ne 0) {
    throw "the staged binary --version probe failed with exit code $LASTEXITCODE"
}

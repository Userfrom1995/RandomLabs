# Smoke-test Windows release artifacts: the one-file exe plus the
# Inno Setup installer. Installs only with -Install (elevated CI
# runner); otherwise verifies payloads and runs the headless logic
# smoke against an isolated data dir.
# Usage: powershell -ExecutionPolicy Bypass -File pet\packaging\smoke-windows.ps1
#        [-Binary PATH] [-Setup PATH] [-Install]
# Used by .github/workflows/pet-release.yml and the per-OS testers.
param(
  [string]$Binary = "dist\desktop-pet.exe",
  [string]$Setup = "",
  [switch]$Install
)
$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $root

function Fail([string]$msg) {
  Write-Error "smoke failure: $msg"
  exit 1
}

$version = (python -m pet version --porcelain).Trim()
if (-not $version) { Fail "could not derive VERSION from pet/__init__.py" }

if (Test-Path $Binary) {
  $pet = $Binary
  Write-Host "[smoke] testing binary $Binary"
} else {
  $pet = $null
  Write-Host "[smoke] no bundle at $Binary, smoking run-from-source"
}

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("pet-smoke-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path (Join-Path $tmp "data") -Force | Out-Null
$env:DESKTOP_PET_DATA_DIR = Join-Path $tmp "data"
# No DESKTOP_PET_NO_DISPLAY here on purpose: every step below is
# headless by construction, and forcing no-display flips the
# tray-capable path inside selftest red. The setup exe is verified
# by name plus payload, launched only with -Install on CI.
try {
  if ($pet) { $run = { param([string[]]$a) & $pet @a } }
  else { $run = { param([string[]]$a) python -m pet @a } }

  Write-Host "[smoke] version..."
  $out = (& $run @("version", "--porcelain")).Trim()
  if ($out -ne $version) { Fail "version mismatch: got '$out', want '$version'" }

  Write-Host "[smoke] selftest..."
  $st = (& $run @("selftest")) | Out-String
  if ($st -notmatch "SELFTEST PASS") { Fail "selftest did not report SELFTEST PASS" }

  Write-Host "[smoke] characters list..."
  $cl = (& $run @("characters", "list")) | Out-String
  if ($cl -notmatch "pip") { Fail "characters list misses pip" }

  Write-Host "[smoke] service start/status/stop cycle..."
  & $run @("service", "start") | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail "service start failed" }
  Start-Sleep -Seconds 2
  $ss = (& $run @("service", "status")) | Out-String
  if ($ss -notmatch "(?i)(running|alive|pid)") { Fail "service status does not report a live service" }
  & $run @("service", "switch", "bramble") | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail "service switch bramble failed" }
  & $run @("service", "switch", "pip") | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail "service switch pip failed" }
  & $run @("service", "stop") | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail "service stop failed" }
  # NB: `service status` always exits 0 (it reports; `stop` acts), so
  # the stopped state is asserted on its text, not its exit code.
  $stopped = (& $run @("service", "status")) | Out-String
  if ($stopped -notmatch "(?i)(stopped|not running)") { Fail "service still reports live after stop: $stopped" }
  Write-Host "[smoke] service stopped clean (no residue)"

  if ($Setup -ne "") {
    Write-Host "[smoke] setup payload $Setup..."
    if (-not (Test-Path $Setup)) { Fail "setup exe missing: $Setup" }
    if ($Setup -notmatch [regex]::Escape($version)) { Fail "setup name misses version $version" }
    Write-Host "[smoke] setup exe is unsigned (expected: honest unsigned-binary note in hub)"
    if ($Install) {
      Write-Host "[smoke] installing $Setup silently..."
      Start-Process -FilePath (Resolve-Path $Setup).Path -ArgumentList "/SILENT" -Wait
      $installed = Join-Path $env:LOCALAPPDATA "Programs\DesktopPet\desktop-pet.exe"
      if (-not (Test-Path $installed)) {
        $installed = Join-Path ${env:ProgramFiles} "DesktopPet\desktop-pet.exe"
      }
      if (-not (Test-Path $installed)) { Fail "installed binary missing after setup" }
      $ist = (& $installed selftest) | Out-String
      if ($ist -notmatch "SELFTEST PASS") { Fail "installed binary selftest failed" }
      $unins = Join-Path (Split-Path $installed) "unins000.exe"
      if (Test-Path $unins) {
        Start-Process -FilePath $unins -ArgumentList "/SILENT" -Wait
      } else {
        Fail "uninstaller missing beside $installed"
      }
      if (Test-Path $installed) { Fail "uninstall left $installed behind" }
      $runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
      if ((Get-ItemProperty -Path $runKey -Name "DesktopPet" -ErrorAction SilentlyContinue)) {
        Fail "uninstall left the DesktopPet Run key behind"
      }
      Write-Host "[smoke] setup install plus uninstall-clean OK"
    }
  }

  $locks = Get-ChildItem -Path $env:DESKTOP_PET_DATA_DIR -Include *.lock, *.pid -Recurse -ErrorAction SilentlyContinue
  if ($locks) { Fail "lock or PID residue left in data dir" }
  Write-Host "[smoke] no lock/PID residue, uninstall-clean OK"
} finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}

Write-Host "[smoke] Windows smoke PASS (version $version)"

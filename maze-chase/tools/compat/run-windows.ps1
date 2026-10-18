# run-windows.ps1 - Windows arm of the real-terminal compatibility harness.
#
# Drives the shipped release binary inside real Windows terminals and
# writes one evidence file per run through collect.py. Windows Terminal
# (windows-terminal row) and legacy conhost (conhost row) are both
# covered. Keystrokes go through SendKeys, screenshots through .NET
# drawing of the window bounds. Run this on a real Windows host or the
# windows-tester runner; the GUI session cannot be synthesized.
#
# Usage:
#   pwsh -File tools/compat/run-windows.ps1                    # both terminals
#   pwsh -File tools/compat/run-windows.ps1 -Emulator conhost  # one terminal
#   pwsh -File tools/compat/run-windows.ps1 -SkipBuild         # reuse the release binary
#
# Requirements: Windows 10/11 with a desktop session, PowerShell 7+
# (pwsh), cargo on PATH for builds, python3 and jq on PATH.
[CmdletBinding()]
param(
  [ValidateSet('all', 'windows-terminal', 'conhost')]
  [string]$Emulator = 'all',
  [string]$Tier = 'auto',
  [switch]$SkipBuild,
  [string]$Initial = '100x40'
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = (Resolve-Path (Join-Path $ScriptDir '../..')).Path
$EvidenceDir = Join-Path $ScriptDir 'evidence'

if ($env:OS -ne 'Windows_NT') {
  Write-Error 'run-windows.ps1: this runner is not Windows'
  exit 3
}

foreach ($dep in @('python3', 'jq')) {
  if (-not (Get-Command $dep -ErrorAction SilentlyContinue)) {
    Write-Error "run-windows.ps1: missing dependency: $dep"
    exit 3
  }
}

$Binary = Join-Path $RepoRoot 'target/release/maze-chase-terminal.exe'
if (-not $SkipBuild) {
  Write-Host 'build: cargo build --release -p maze-chase-terminal'
  Push-Location $RepoRoot
  try { cargo build --release -p maze-chase-terminal } finally { Pop-Location }
}
if (-not (Test-Path $Binary)) {
  Write-Error "run-windows.ps1: binary not found: $Binary"
  exit 3
}

$Stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddHHmmss')
$OutDir = Join-Path $env:TEMP "maze-chase-compat-win/$Stamp"
New-Item -ItemType Directory -Force -Path $OutDir, $EvidenceDir | Out-Null

function Write-Unverified {
  param([string]$Emu, [string]$Reason)
  $runDir = Join-Path $OutDir "unverified-$Emu-$Tier"
  New-Item -ItemType Directory -Force -Path (Join-Path $runDir 'session') | Out-Null
  Set-Content -Path (Join-Path $runDir 'session/events.log') -Value ''
  $meta = [ordered]@{
    emulator = $Emu; emulator_version = 'n/a'; os = 'windows'; arch = 'x86_64'
    driver = 'none'; requested_tier = $Tier; extra_env = @()
    transcript = 'session/pty.log'
    runner = @{ host = $env:COMPUTERNAME; id = 'compat-harness' }
    started_at = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    geometry = @{}; duration_s = 0; exit = $null
    notes = @('recorded as unverified by run-windows.ps1')
  }
  $meta | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $runDir 'session/meta.json')
  & python3 (Join-Path $ScriptDir 'collect.py') --run-dir $runDir --emulator $Emu `
    --os windows --tier $Tier --result unverified --unverified-reason $Reason `
    --evidence-dir $EvidenceDir
}

function Send-Keys {
  param([string[]]$Keys)
  Add-Type -AssemblyName System.Windows.Forms
  foreach ($k in $Keys) {
    [System.Windows.Forms.SendKeys]::SendWait($k)
    Start-Sleep -Milliseconds 160
  }
}

function Capture-Window {
  param([IntPtr]$Hwnd, [string]$Path)
  Add-Type -AssemblyName System.Drawing
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Rect {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
  $r = New-Object Win32Rect+RECT
  [void][Win32Rect]::GetWindowRect($Hwnd, [ref]$r)
  $w = $r.Right - $r.Left; $h = $r.Bottom - $r.Top
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

function Invoke-Run {
  param([string]$Emu)
  $name = "$Emu-$Tier"
  $runDir = Join-Path $OutDir "run-$name"
  $session = Join-Path $runDir 'session'
  New-Item -ItemType Directory -Force -Path $session, (Join-Path $runDir 'config'), (Join-Path $runDir 'home') | Out-Null

  $tierFlag = @(); if ($Tier -ne 'auto') { $tierFlag = @('--tier', $Tier) }
  $runner = Join-Path $session 'run-game.ps1'
  @"
`$env:HOME = '$($runDir -replace '\\','/')/home'
`$env:MAZE_CHASE_TRACE = '$($session -replace '\\','/')/trace.jsonl'
& '$Binary' --dir '$($runDir -replace '\\','/')/config' $($tierFlag -join ' ')
Start-Sleep -Seconds 0.3
"@ | Set-Content -Path $runner

  $transcript = Join-Path $session 'pty.log'
  switch ($Emu) {
    'windows-terminal' {
      if (-not (Get-Command wt -ErrorAction SilentlyContinue)) {
        Write-Unverified $Emu 'Windows Terminal (wt) is not installed on this host'
        return
      }
      $proc = Start-Process wt -ArgumentList @(
        'new-tab', '--title', 'maze-chase-compat',
        'pwsh', '-NoProfile', '-Command',
        "& '$runner' 2>&1 | Tee-Object -FilePath '$transcript'"
      ) -PassThru
    }
    'conhost' {
      $proc = Start-Process pwsh -ArgumentList @(
        '-NoProfile', '-Command',
        "& '$runner' 2>&1 | Tee-Object -FilePath '$transcript'"
      ) -PassThru
    }
  }

  Start-Sleep -Seconds 3
  # Find the terminal window by title (Windows Terminal honors --title;
  # conhost shows the shell title).
  Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class WinFind {
  [DllImport("user32.dll")] public static extern IntPtr FindWindow(string cls, string title);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
"@
  $hwnd = [WinFind]::FindWindow($null, 'maze-chase-compat')
  if ($hwnd -eq [IntPtr]::Zero) {
    $hwnd = [WinFind]::GetForegroundWindow()
  }
  [void][WinFind]::SetForegroundWindow($hwnd)

  $shots = Join-Path $session 'screenshots'
  New-Item -ItemType Directory -Force -Path $shots | Out-Null
  $now = { [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() }
  $bytes = { if (Test-Path $transcript) { (Get-Item $transcript).Length } else { 0 } }
  $events = Join-Path $session 'events.log'
  function Log-Event([string]$type, [string]$detail, [string]$shot) {
    Add-Content -Path $events -Value ("{0}`t{1}`t{2}`t{3}`t{4}" -f (& $now), $type, $detail, (& $bytes), $shot)
  }

  function Checkpoint([string]$name) {
    $p = Join-Path $shots "$name.png"
    try { Capture-Window -Hwnd $hwnd -Path $p; Log-Event 'checkpoint' $name $p }
    catch { Log-Event 'checkpoint' $name '' }
    Write-Host "checkpoint: $name"
  }

  Checkpoint 'title'
  Send-Keys @('{ENTER}'); Start-Sleep -Seconds 2
  Send-Keys @('{RIGHT}', '{RIGHT}', '{UP}', '{LEFT}', '{DOWN}'); Start-Sleep -Milliseconds 600
  Checkpoint 'playing'
  Send-Keys @('{ESC}'); Start-Sleep -Milliseconds 800
  Checkpoint 'paused'
  Send-Keys @('{DOWN}', '{ENTER}'); Start-Sleep -Milliseconds 800
  Checkpoint 'title-return'
  Send-Keys @('{DOWN}', '{ENTER}'); Start-Sleep -Milliseconds 800
  Checkpoint 'help'
  Send-Keys @('{ESC}', '{DOWN}', '{ENTER}'); Start-Sleep -Milliseconds 800
  Checkpoint 'scores'
  Send-Keys @('{ESC}', '{DOWN}', '{ENTER}'); Start-Sleep -Milliseconds 800
  Checkpoint 'settings'
  Send-Keys @('{ESC}', '{DOWN}', '{ENTER}'); Start-Sleep -Seconds 2
  $exited = $proc.HasExited
  Log-Event 'exit' "exited=$($exited.ToString().ToLower()) killed=false" ''

  $meta = [ordered]@{
    emulator = $Emu; emulator_version = 'system'; os = 'windows'; arch = 'x86_64'
    driver = 'windows'; requested_tier = $Tier; extra_env = @()
    transcript = 'session/pty.log'
    runner = @{ host = $env:COMPUTERNAME; id = 'compat-harness' }
    started_at = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    geometry = @{ initial = @{ cols = 100; rows = 40 } }; duration_s = 0
    exit = @{ code = $null; killed = (-not $exited); game_exited = $exited; process_exited = $exited }
  }
  $meta | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $session 'meta.json')

  $result = if ($exited) { 'pass' } else { 'partial' }
  & python3 (Join-Path $ScriptDir 'collect.py') --run-dir $runDir --emulator $Emu `
    --os windows --tier $Tier --result $result `
    --notes 'session driven by run-windows.ps1 (SendKeys + window capture)' `
    --evidence-dir $EvidenceDir
  Write-Host "  scratch at $runDir"
}

switch ($Emulator) {
  'all' { Invoke-Run 'windows-terminal'; Invoke-Run 'conhost' }
  default { Invoke-Run $Emulator }
}

Write-Host "evidence written to $EvidenceDir"

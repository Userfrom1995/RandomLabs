# run-windows.ps1 - Windows arm of the real-terminal compatibility harness.
#
# Drives the shipped release binary inside real Windows terminals and
# writes one evidence file per run through collect.py. Windows Terminal
# (windows-terminal row) and legacy conhost (conhost row) are both
# covered. Keystrokes go through SendKeys, screenshots through .NET
# drawing of the window bounds. Run this on a real Windows host or the
# windows-tester runner; the GUI session cannot be synthesized.
#
# There is deliberately NO pty transcript on Windows: capturing stdout
# requires a pipe, and the game refuses a non-terminal stdout on Windows
# (`crates/terminal/src/main.rs`), so a piped run exits before painting
# anything. The game therefore runs unpiped in a real console and the row
# is graded from the game process itself (pid file plus exit code file);
# the evidence is the screenshots plus that process record, and the row
# notes say so.
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

$InitialParts = $Initial -split 'x'
if ($InitialParts.Count -ne 2 -or -not ($InitialParts[0] -as [int]) -or -not ($InitialParts[1] -as [int])) {
  Write-Error "run-windows.ps1: -Initial must look like 100x40 (got '$Initial')"
  exit 2
}
$InitCols = [int]$InitialParts[0]
$InitRows = [int]$InitialParts[1]

$Arch = switch ($env:PROCESSOR_ARCHITECTURE) {
  'AMD64' { 'x86_64' }
  'ARM64' { 'aarch64' }
  'x86'   { 'i686' }
  default { 'unknown' }
}

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
    emulator = $Emu; emulator_version = 'n/a'; os = 'windows'; arch = $Arch
    driver = 'none'; requested_tier = $Tier; extra_env = @()
    transcript = $null
    runner = @{ host = $env:COMPUTERNAME; id = 'compat-harness' }
    started_at = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    ended_at = $null
    geometry = @{}; duration_s = 0; exit = $null
    notes = @('recorded as unverified by run-windows.ps1',
              'no pty transcript exists on Windows: piping stdout would break the game''s terminal check; evidence is the screenshots plus the game process record')
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

  $runDirSlash = $runDir -replace '\\','/'
  $sessionSlash = $session -replace '\\','/'
  $gameArgs = "@('--dir', '$runDirSlash/config'"
  if ($Tier -ne 'auto') {
    $gameArgs += ", '--tier', '$Tier'"
  }
  $gameArgs += ')'
  $runner = Join-Path $session 'run-game.ps1'
  # The game itself must own the console's stdout (no pipe anywhere):
  # Start-Process returns the game's own process handle, whose pid and
  # exit code are the grading evidence.
  @"
`$env:HOME = '$runDirSlash/home'
`$env:MAZE_CHASE_TRACE = '$sessionSlash/trace.jsonl'
`$game = Start-Process -FilePath '$Binary' -ArgumentList $gameArgs -PassThru
`$game.Id | Set-Content -Path '$sessionSlash/game.pid'
`$game.WaitForExit()
`$game.ExitCode | Set-Content -Path '$sessionSlash/game.exit'
"@ | Set-Content -Path $runner

  $proc = $null
  switch ($Emu) {
    'windows-terminal' {
      if (-not (Get-Command wt -ErrorAction SilentlyContinue)) {
        Write-Unverified $Emu 'Windows Terminal (wt) is not installed on this host'
        return
      }
      $proc = Start-Process wt -ArgumentList @(
        'new-tab', '--title', 'maze-chase-compat',
        'pwsh', '-NoProfile', '-File', $runner
      ) -PassThru
    }
    'conhost' {
      $proc = Start-Process pwsh -ArgumentList @(
        '-NoProfile', '-File', $runner
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
  $startedAt = (Get-Date).ToUniversalTime()
  $now = { [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() }
  # No transcript exists on Windows (see the file header): the event
  # stream records 0 transcript bytes at every event on purpose.
  $bytes = { 0 }
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

  # Grade from the game's own process, never from the wt/pwsh launcher.
  $pidFile = Join-Path $session 'game.pid'
  $exitFile = Join-Path $session 'game.exit'
  $gamePid = $null
  if (Test-Path $pidFile) {
    $pidText = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($pidText) { $gamePid = [int]$pidText }
  }
  $gameExited = $false
  if ($gamePid) {
    $gameExited = -not [bool](Get-Process -Id $gamePid -ErrorAction SilentlyContinue)
  }
  $killed = $false
  if ($gamePid -and -not $gameExited) {
    Stop-Process -Id $gamePid -Force -ErrorAction SilentlyContinue
    $killed = $true
    Start-Sleep -Milliseconds 300
    $gameExited = -not [bool](Get-Process -Id $gamePid -ErrorAction SilentlyContinue)
  }
  $gameExitCode = $null
  if ($gameExited -and (Test-Path $exitFile)) {
    $exitText = (Get-Content $exitFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($exitText) { $gameExitCode = [int]$exitText }
  }
  Log-Event 'exit' "exited=$($gameExited.ToString().ToLower()) killed=$($killed.ToString().ToLower()) game_exit=$gameExitCode" ''
  if ($proc -and -not $proc.HasExited) {
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  }

  $endedAt = (Get-Date).ToUniversalTime()
  $meta = [ordered]@{
    emulator = $Emu; emulator_version = 'system'; os = 'windows'; arch = $Arch
    driver = 'windows'; requested_tier = $Tier; extra_env = @()
    transcript = $null
    runner = @{ host = $env:COMPUTERNAME; id = 'compat-harness' }
    started_at = $startedAt.ToString('yyyy-MM-ddTHH:mm:ssZ')
    ended_at = $endedAt.ToString('yyyy-MM-ddTHH:mm:ssZ')
    geometry = @{
      requested = @{ initial = @{ cols = $InitCols; rows = $InitRows } }
      measured = @{}
      resize_exercised = $false
    }
    duration_s = [int]($endedAt - $startedAt).TotalSeconds
    exit = @{ code = $gameExitCode; killed = $killed; game_exited = $gameExited; process_exited = $gameExited }
    notes = @(
      'session driven by run-windows.ps1 (SendKeys + window capture)',
      'no pty transcript on Windows: piping stdout would break the game''s terminal check; graded from the game process (game.pid plus game.exit) and the screenshots'
    )
  }
  $meta | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $session 'meta.json')

  $result = 'pass'
  $reason = $null
  if (-not $gamePid) {
    $result = 'unverified'
    $reason = 'the game process never started (no game.pid written by the session runner); the launcher exited at startup'
  } elseif (-not $gameExited) {
    $result = 'partial'
  }
  if ($reason) {
    & python3 (Join-Path $ScriptDir 'collect.py') --run-dir $runDir --emulator $Emu `
      --os windows --tier $Tier --result $result --unverified-reason $reason `
      --notes 'session driven by run-windows.ps1 (SendKeys + window capture)' `
      --evidence-dir $EvidenceDir
  } else {
    & python3 (Join-Path $ScriptDir 'collect.py') --run-dir $runDir --emulator $Emu `
      --os windows --tier $Tier --result $result `
      --notes 'session driven by run-windows.ps1 (SendKeys + window capture)' `
      --evidence-dir $EvidenceDir
  }
  Write-Host "  scratch at $runDir"
}

switch ($Emulator) {
  'all' { Invoke-Run 'windows-terminal'; Invoke-Run 'conhost' }
  default { Invoke-Run $Emulator }
}

Write-Host "evidence written to $EvidenceDir"

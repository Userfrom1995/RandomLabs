# run-windows.ps1 - Windows arm of the real-terminal compatibility harness.
#
# Drives the release binary inside real Windows terminals and
# writes one evidence file per run through collect.py. Windows Terminal
# (windows-terminal row) and legacy conhost (conhost row) are both
# covered. Keystrokes go through SendKeys, screenshots through .NET
# drawing of the window bounds. Run this on a real Windows host or the
# windows-tester runner; the GUI session cannot be synthesized.
#
# There is deliberately NO pty transcript on Windows: capturing stdout
# requires a pipe, and the game refuses a non-terminal stdout on Windows
# (`crates/terminal/src/main.rs`), so a piped run exits before painting
# anything. The game therefore runs unpiped in the session runner's own
# console (`Start-Process -NoNewWindow`): the console that receives the
# keystrokes is the console the game renders in. The row is graded from
# the game process itself (pid file plus exit code file) and the capture
# set; the evidence is the screenshots plus that process record, and the
# row notes say so.
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
  [ValidateSet('auto', 'kitty', 'sixel', 'truecolor', 'legacy')]
  [string]$Tier = 'auto',
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

$Script:ValidCaptures = 0

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

function Test-PngFile([string]$Path) {
  # Same floor the collector enforces: PNG signature plus nonzero
  # dimensions. A capture that fails it is not evidence and is removed.
  if (-not (Test-Path $Path)) { return $false }
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  if ($bytes.Length -lt 24) { return $false }
  $sig = [byte[]](0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
  for ($i = 0; $i -lt 8; $i++) { if ($bytes[$i] -ne $sig[$i]) { return $false } }
  $w = [System.Net.IPAddress]::NetworkToHostOrder([System.BitConverter]::ToInt32($bytes, 16))
  $h = [System.Net.IPAddress]::NetworkToHostOrder([System.BitConverter]::ToInt32($bytes, 20))
  return ($w -gt 0 -and $h -gt 0)
}

function Invoke-Run {
  param([string]$Emu)
  $name = "$Emu-$Tier"
  $runDir = Join-Path $OutDir "run-$name"
  $session = Join-Path $runDir 'session'
  New-Item -ItemType Directory -Force -Path $session, (Join-Path $runDir 'config'), (Join-Path $runDir 'home') | Out-Null

  $runDirSlash = $runDir -replace '\\','/'
  $sessionSlash = $session -replace '\\','/'
  # Single-quoted here-string literals: double embedded quotes so a path
  # or user name containing an apostrophe cannot break the generated
  # runner's syntax.
  $runDirSlashQ = $runDirSlash.Replace("'", "''")
  $sessionSlashQ = $sessionSlash.Replace("'", "''")
  $binaryQ = $Binary.Replace("'", "''")
  $tierArgs = ''
  if ($Tier -ne 'auto') {
    $tierArgs = ", '--tier', '$Tier'"
  }
  $runner = Join-Path $session 'run-game.ps1'
  # The game must share the session runner's console (-NoNewWindow): a
  # separate console would render in a window the driver never captures
  # or drives. No pipe anywhere, so the game's terminal check passes and
  # Start-Process returns the game's own process handle, whose pid and
  # exit code are the grading evidence. Arguments are quoted at runtime
  # because Start-Process joins -ArgumentList without quoting.
  @"
`$env:HOME = '$runDirSlashQ/home'
`$env:MAZE_CHASE_TRACE = '$sessionSlashQ/trace.jsonl'
[Console]::Title = 'maze-chase-compat'
`$gameArgs = @('--dir', '$runDirSlashQ/config'$tierArgs)
`$gameArgs = `$gameArgs | ForEach-Object { if (`$_ -match '\s') { '"' + `$_ + '"' } else { `$_ } }
`$game = Start-Process -FilePath '$binaryQ' -ArgumentList `$gameArgs -PassThru -NoNewWindow
`$game.Id | Set-Content -Path '$sessionSlashQ/game.pid'
`$game.WaitForExit()
`$game.ExitCode | Set-Content -Path '$sessionSlashQ/game.exit'
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
        'pwsh', '-NoProfile', '-File', ('"{0}"' -f $runner)
      ) -PassThru
    }
    'conhost' {
      $proc = Start-Process pwsh -ArgumentList @(
        '-NoProfile', '-File', ('"{0}"' -f $runner)
      ) -PassThru
    }
  }
  $Script:ValidCaptures = 0

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
    $ok = $false
    try {
      Capture-Window -Hwnd $hwnd -Path $p
      $ok = Test-PngFile -Path $p
    } catch { $ok = $false }
    if ($ok) {
      $Script:ValidCaptures++
      # Log the run-directory-relative path, never the scratch root: the
      # committed events.log must match the Linux logs (collect.py
      # resolves the relative path against the run directory).
      Log-Event 'checkpoint' $name ("session/screenshots/{0}.png" -f $name)
    } else {
      Remove-Item -Path $p -Force -ErrorAction SilentlyContinue
      Log-Event 'checkpoint' $name ''
    }
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
    $parsedPid = 0
    if ($pidText -and [int]::TryParse($pidText.Trim(), [ref]$parsedPid) -and $parsedPid -gt 0) {
      $gamePid = $parsedPid
    } else {
      Log-Event 'note' 'game.pid exists but does not contain a pid' ''
    }
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
  if ($gameExited) {
    # The session runner writes game.exit right after WaitForExit
    # returns; the process can disappear a moment before the file is
    # flushed. Wait until the file exists AND carries a non-empty value,
    # so a present-but-unflushed file is not misread as an unreadable
    # exit code.
    $exitText = $null
    for ($i = 0; $i -lt 15; $i++) {
      $exitText = (Get-Content $exitFile -ErrorAction SilentlyContinue | Select-Object -First 1)
      if ($exitText -and $exitText.Trim()) { break }
      Start-Sleep -Milliseconds 200
    }
    if ($exitText -and $exitText.Trim()) {
      $parsedExit = 0
      if ([int]::TryParse($exitText.Trim(), [ref]$parsedExit)) {
        $gameExitCode = $parsedExit
      }
    }
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
      requested = $null
      measured = @{}
      resize_exercised = $false
    }
    duration_s = [int]($endedAt - $startedAt).TotalSeconds
    exit = @{ code = $gameExitCode; killed = $killed; game_exited = $gameExited; process_exited = $gameExited }
    notes = @(
      'session driven by run-windows.ps1 (SendKeys + window capture)',
      'the game shares the session runner console (Start-Process -NoNewWindow); no pty transcript exists on Windows because piping stdout would break the game''s terminal check',
      'graded from the game process (game.pid plus game.exit) and the capture set: a pass requires a zero exit code and at least one valid PNG capture',
      'the terminal host owns the window geometry: no size is requested, and the captures record what the host provided'
    )
  }
  $meta | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $session 'meta.json')

  $result = 'pass'
  $reason = $null
  if (-not $gamePid) {
    $result = 'unverified'
    $reason = 'the game process never started (no game.pid written by the session runner); the launcher exited at startup'
  } elseif ($killed) {
    # The only path to a still-running game at grading is a failed stop:
    # a game already gone was never killed, and every other branch below
    # requires the process to have exited.
    $result = 'partial'
    if ($gameExited) {
      $reason = 'the game process was still running at the end of the session (the quit key never landed); the harness stopped it'
    } else {
      $reason = 'the game process was still running at the end of the session (the quit key never landed); Stop-Process did not end it'
    }
  } elseif ($null -eq $gameExitCode) {
    $result = 'partial'
    $reason = 'the game process exited but no readable exit code was recorded (game.exit missing or unparsable); see the session captures'
  } elseif ($gameExitCode -ne 0) {
    $result = 'partial'
    $reason = "game exited with code $gameExitCode; see the session captures"
  } elseif ($Script:ValidCaptures -lt 1) {
    $result = 'partial'
    $reason = 'no checkpoint capture produced a valid PNG; the session is recorded without render evidence'
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

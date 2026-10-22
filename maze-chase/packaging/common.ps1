# Shared PowerShell packaging helpers for the Windows release path.
#
# Dot-source from a packaging script. The workspace version is read from
# the same [workspace.package] table every crate and Unix script uses,
# so a version bump cannot leave a stale Windows artifact name behind.

$ErrorActionPreference = "Stop"

$PackagingDir = $PSScriptRoot
$Root = (Resolve-Path (Join-Path $PackagingDir "..")).Path
$RepoRoot = (Resolve-Path (Join-Path $Root "..")).Path
$Dist = Join-Path $Root "dist"

# Rust's MSVC targets link the dynamic CRT by default, which assumes the
# VC++ redistributable is installed. These per-user artifacts must start
# on a clean Windows install, so link the static CRT for every Windows
# build and let Assert-StaticCrt prove it below.
if ($env:OS -eq "Windows_NT" -and $env:RUSTFLAGS -notmatch [regex]::Escape("-C target-feature=+crt-static")) {
    $env:RUSTFLAGS = ("$env:RUSTFLAGS -C target-feature=+crt-static").Trim()
}

function Get-WorkspaceVersion {
    param([string]$Manifest = (Join-Path $Root "Cargo.toml"))
    $text = Get-Content -Raw $Manifest
    $match = [regex]::Match(
        $text,
        '(?ms)^\[workspace\.package\]\s*\r?\n(.*?)(?=^\[|\z)'
    )
    if (-not $match.Success) {
        throw "cannot find [workspace.package] in $Manifest"
    }
    $versionMatch = [regex]::Match($match.Groups[1].Value, '(?m)^version\s*=\s*"([^"]+)"')
    if (-not $versionMatch.Success) {
        throw "cannot find version in [workspace.package] of $Manifest"
    }
    return $versionMatch.Groups[1].Value
}

$Version = Get-WorkspaceVersion

# Source date epoch for deterministic zip entry timestamps. GitHub sets
# SOURCE_DATE_EPOCH for reproducible builds; fall back to the commit time.
$SourceDateEpoch = 0
if ($env:SOURCE_DATE_EPOCH -and $env:SOURCE_DATE_EPOCH -match '^\d+$') {
    $SourceDateEpoch = [int64]$env:SOURCE_DATE_EPOCH
} else {
    $stamp = & git -C (Split-Path -Parent $Root) log -1 --format=%ct 2>$null
    if ($LASTEXITCODE -eq 0 -and $stamp -match '^\d+$') {
        $SourceDateEpoch = [int64]$stamp
    }
}
# ZipArchiveEntry timestamps reject dates before 1980-01-01. A missing
# SOURCE_DATE_EPOCH on a non-git tree would leave the epoch at 0 (1970)
# and make every zip reproducible-writer call throw.
if ($SourceDateEpoch -lt 315532800) {
    Write-Warning "SOURCE_DATE_EPOCH is $SourceDateEpoch (before 1980-01-01); clamping zip timestamps to 315532800"
    $SourceDateEpoch = 315532800
}

function Get-Sha256 {
    param([string]$Path)
    return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash.ToLowerInvariant()
}

# Locate dumpbin from the MSVC toolchain. The windows-latest image has
# Visual Studio installed but dumpbin is not on PATH by default.
function Get-MsvcDumpbin {
    $onPath = Get-Command dumpbin.exe -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }
    $programFilesX86 = ${env:ProgramFiles(x86)}
    if (-not $programFilesX86) { return $null }
    $vswhere = Join-Path $programFilesX86 "Microsoft Visual Studio\Installer\vswhere.exe"
    if (-not (Test-Path $vswhere)) { return $null }
    $vs = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($LASTEXITCODE -ne 0 -or -not $vs) { return $null }
    $vs = ($vs | Select-Object -First 1).Trim()
    $tools = Join-Path $vs "VC\Tools\MSVC"
    if (-not (Test-Path $tools)) { return $null }
    return Get-ChildItem -Path $tools -Directory |
        Sort-Object Name -Descending |
        ForEach-Object { Join-Path $_.FullName "bin\Hostx64\x64\dumpbin.exe" } |
        Where-Object { Test-Path $_ } |
        Select-Object -First 1
}

# The release binaries link the static CRT so a clean machine needs no
# VC++ redistributable. Prove it instead of trusting the build flag:
# dumpbin reports VCRUNTIME/MSVCP when the dynamic CRT crept back in.
function Assert-StaticCrt {
    param([string[]]$Executables)
    $dumpbin = Get-MsvcDumpbin
    if (-not $dumpbin) {
        throw "dumpbin not found; install the MSVC build tools to verify the static CRT"
    }
    foreach ($exe in $Executables) {
        $deps = (& $dumpbin /nologo /dependents $exe | Out-String)
        if ($LASTEXITCODE -ne 0) {
            throw "dumpbin failed for $exe with exit code $LASTEXITCODE"
        }
        if ($deps -match '(?m)^\s+(VCRUNTIME|MSVCP)\d') {
            throw "dynamic CRT dependency remains in $exe; the build must use -C target-feature=+crt-static"
        }
        Write-Host "static CRT verified: $exe"
    }
}

function Write-Checksums {
    param([string]$Directory, [string[]]$Files)
    $lines = @()
    foreach ($file in ($Files | Sort-Object)) {
        $path = Join-Path $Directory $file
        $lines += "$(Get-Sha256 $path)  $file"
    }
    $target = Join-Path $Directory "SHA256SUMS.txt"
    # UTF-8 without a BOM: sha256sum -c on the merged Linux manifest must
    # parse the first line, and Windows PowerShell 5.1's utf8 encoding
    # writes a BOM.
    $encoding = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($target, (($lines -join "`n") + "`n"), $encoding)
    Write-Host "wrote $target"
}

# Deterministic zip: entries sorted by name and stamped with the source
# commit time, so rebuilding the same commit yields the same archive.
function New-ReproducibleZip {
    param([string]$Stage, [string]$Out)
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    if (Test-Path $Out) { Remove-Item -Force $Out }
    $zip = [System.IO.Compression.ZipFile]::Open(
        $Out,
        [System.IO.Compression.ZipArchiveMode]::Create
    )
    try {
        $files = Get-ChildItem -Path $Stage -File -Recurse | Sort-Object FullName
        $stamp = [DateTimeOffset]::FromUnixTimeSeconds($SourceDateEpoch)
        foreach ($file in $files) {
            $relative = $file.FullName.Substring($Stage.Length + 1).Replace('\', '/')
            $entry = $zip.CreateEntry(
                $relative,
                [System.IO.Compression.CompressionLevel]::Optimal
            )
            $entry.LastWriteTime = $stamp
            $stream = [System.IO.File]::OpenRead($file.FullName)
            try {
                $output = $entry.Open()
                try {
                    $stream.CopyTo($output)
                } finally {
                    $output.Dispose()
                }
            } finally {
                $stream.Dispose()
            }
        }
    } finally {
        $zip.Dispose()
    }
    Write-Host "staged: $Out"
    Write-Host "sha256: $(Get-Sha256 $Out)"
}

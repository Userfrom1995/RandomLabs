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

function Get-Sha256 {
    param([string]$Path)
    return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash.ToLowerInvariant()
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

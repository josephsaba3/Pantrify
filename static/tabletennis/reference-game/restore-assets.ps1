$ErrorActionPreference = 'Stop'
$referenceRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$sourceBundle = Join-Path $referenceRoot 'supplied/Table Tennis World Tour_files/a_data/TweenMax.min_0op3.js'
$gameBundle = Join-Path $referenceRoot 'game.js'
$bundleBytes = [System.IO.File]::ReadAllBytes($sourceBundle)
if (-not (Test-Path -LiteralPath $gameBundle)) {
    [System.IO.File]::WriteAllBytes($gameBundle, $bundleBytes)
}

$assetBase = 'https://games.cdn.famobi.com/html5games/t/table-tennis-world-tour/92a8f146/'
$bundleText = [System.Text.Encoding]::UTF8.GetString($bundleBytes)
# Only the dormant multiple-language selection branch references this obsolete
# image. The supplied game has aLangs = ["EN"] and its CDN returns 404 for it.
$optionalAssetPaths = @('images/preloadImage.jpg')
$assetPaths = [regex]::Matches($bundleText, '(?:images|audio)/[A-Za-z0-9_.-]+\.(?:png|jpg|ogg|m4a)') |
    ForEach-Object { $_.Value } | Where-Object { $_ -notin $optionalAssetPaths } | Sort-Object -Unique
$records = @()
$failed = @()
foreach ($relative in $assetPaths) {
    $target = [System.IO.Path]::GetFullPath((Join-Path $referenceRoot $relative))
    if (-not $target.StartsWith($referenceRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw 'Asset path escaped the reference folder.'
    }
    [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($target)) | Out-Null
    try {
        if (-not (Test-Path -LiteralPath $target)) {
            Invoke-WebRequest -UseBasicParsing -Uri ($assetBase + $relative) -OutFile $target -TimeoutSec 20
        }
        $records += [ordered]@{
            path = $relative
            url = $assetBase + $relative
            bytes = (Get-Item -LiteralPath $target).Length
            sha256 = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
        }
        Write-Output ('Ready: ' + $relative)
    } catch {
        $failed += $relative
        Write-Output ('Unavailable: ' + $relative + ' - ' + $_.Exception.Message)
    }
}
$manifest = [ordered]@{
    source = 'User-supplied Downloads.zip'
    originalBundle = 'Table Tennis World Tour_files/a_data/TweenMax.min_0op3.js'
    bundleSha256 = (Get-FileHash -LiteralPath $sourceBundle -Algorithm SHA256).Hash.ToLowerInvariant()
    downloadedAtUtc = [DateTime]::UtcNow.ToString('o')
    assets = $records
    missing = $failed
    unusedOptionalAssets = $optionalAssetPaths
}
[System.IO.File]::WriteAllText((Join-Path $referenceRoot 'source-manifest.json'), ($manifest | ConvertTo-Json -Depth 5), [System.Text.UTF8Encoding]::new($false))
Write-Output ('Assets ready: ' + $records.Count + '; missing: ' + $failed.Count)
if ($failed.Count -gt 0) { exit 1 }

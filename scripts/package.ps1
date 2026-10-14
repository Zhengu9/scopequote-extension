$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$extension = Join-Path $root "extension"
$dist = Join-Path $root "dist"
$docsDownloads = Join-Path $root "docs\downloads"
$zipPath = Join-Path $dist "scopequote-extension.zip"

if (-not (Test-Path -LiteralPath (Join-Path $extension "manifest.json"))) {
    throw "extension/manifest.json not found"
}

New-Item -ItemType Directory -Force -Path $dist, $docsDownloads | Out-Null
Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue
$staging = Join-Path ([System.IO.Path]::GetTempPath()) ("scopequote-package-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $staging | Out-Null

try {
    Copy-Item -Path (Join-Path $extension "*") -Destination $staging -Recurse
    Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zipPath -CompressionLevel Optimal
    Copy-Item -LiteralPath $zipPath -Destination (Join-Path $docsDownloads "scopequote-extension.zip") -Force

    $verify = Join-Path ([System.IO.Path]::GetTempPath()) ("scopequote-verify-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $verify | Out-Null
    try {
        Expand-Archive -LiteralPath $zipPath -DestinationPath $verify
        $manifest = Join-Path $verify "manifest.json"
        if (-not (Test-Path -LiteralPath $manifest)) {
            throw "ZIP root does not contain manifest.json"
        }
        $parsed = Get-Content -Raw -Encoding UTF8 -LiteralPath $manifest | ConvertFrom-Json
        if ($parsed.manifest_version -ne 3) {
            throw "Extracted manifest is not Manifest V3"
        }
        Write-Output "ZIP verified: manifest.json is at archive root; version $($parsed.version), Manifest V3."
    }
    finally {
        Remove-Item -LiteralPath $verify -Recurse -Force -ErrorAction SilentlyContinue
    }
}
finally {
    Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Output "Created $zipPath"
Write-Output "Copied local website download to docs/downloads/scopequote-extension.zip"

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$fixture = Join-Path $PSScriptRoot 'fixture'
$index = Join-Path $PSScriptRoot 'output/fixture.scip'
$decoded = Join-Path $PSScriptRoot 'output/fixture-decoded.json'
$summary = Join-Path $PSScriptRoot 'output/plane-sync-summary.json'

npx --yes --package @sourcegraph/scip-typescript@0.4.0 -- scip-typescript index --cwd $fixture --output $index --no-progress-bar
if ($LASTEXITCODE -ne 0) { throw 'SCIP fixture indexing failed.' }
node (Join-Path $PSScriptRoot 'scripts/decode-scip.cjs') $index $fixture $decoded
if ($LASTEXITCODE -ne 0) { throw 'SCIP decoding failed.' }
node (Join-Path $PSScriptRoot 'scripts/render-viewer.cjs') $decoded (Join-Path $PSScriptRoot 'fixture-viewer.html')
if ($LASTEXITCODE -ne 0) { throw 'Viewer generation failed.' }
node (Join-Path $PSScriptRoot 'scripts/decode-scip.cjs') (Join-Path $root 'experiments/grafe-research/plane-sync-scip-typescript.scip') 'D:/ware/plane-sync' $summary summary
if ($LASTEXITCODE -ne 0) { throw 'Read-only plane-sync span audit failed.' }
node (Join-Path $PSScriptRoot 'scripts/browser-smoke.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Headless browser smoke failed.' }

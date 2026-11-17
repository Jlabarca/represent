param([string]$Image = 'notcards-botanic:rep12-stage', [switch]$MountCandidate)
$ErrorActionPreference = 'Stop'
$mongoName = 'notcards-fixture-' + [Guid]::NewGuid().ToString('N').Substring(0,10)
docker run -d --rm --network none --name $mongoName mongo:8.0.20 | Out-Null
if ($LASTEXITCODE) { throw 'Could not start the disposable Mongo container' }
try {
    $options = @('run','--rm','--network',("container:" + $mongoName),'-e','NOTCARDS_DISPOSABLE_SMOKE=1')
    $options += @('--mount',("type=bind,source=" + (Join-Path $PSScriptRoot 'staging-smoke.cjs') + ",target=/tmp/staging-smoke.cjs,readonly"))
    if ($MountCandidate) {
        $options += @('--mount',("type=bind,source=" + (Join-Path $PSScriptRoot 'server') + ",target=/app/api/server/notcards,readonly"))
    }
    $options += @('--entrypoint','node',$Image,'/tmp/staging-smoke.cjs')
    docker @options
    if ($LASTEXITCODE) { throw 'The native Notcards integration check failed' }
} finally {
    docker stop $mongoName | Out-Null
}

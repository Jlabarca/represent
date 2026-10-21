param([string]$GhostEnvPath = '', [int]$Port = 8871)
$ErrorActionPreference = 'Stop'
$taskOldKey = $env:VISU_GHOST_KEY
$taskOldPort = $env:VISU_PORT
try {
    if ($GhostEnvPath) {
        $taskKeyLine = Get-Content -LiteralPath $GhostEnvPath | Where-Object { $_ -match '^LITELLM_KEY_OPERATOR=' } | Select-Object -First 1
        if (-not $taskKeyLine) { throw 'The selected Ghost environment file has no operator virtual-key assignment.' }
        $env:VISU_GHOST_KEY = $taskKeyLine.Substring($taskKeyLine.IndexOf('=') + 1).Trim().Trim('"').Trim("'")
    }
    $env:VISU_PORT = [string]$Port
    & node (Join-Path $PSScriptRoot '../src/visu/cli.mjs') serve
    if ($LASTEXITCODE -ne 0) { throw 'Visu server stopped with an error.' }
}
finally {
    $env:VISU_GHOST_KEY = $taskOldKey
    $env:VISU_PORT = $taskOldPort
}

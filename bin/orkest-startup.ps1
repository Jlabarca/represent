#!/usr/bin/env pwsh
param([string]$Harness)
$ErrorActionPreference = 'Stop'
$py = $null
foreach ($candidate in @($env:ORKEST_PYTHON, $env:GHOSTDEV_PYTHON, 'python3', 'python')) {
    if (-not $candidate -or -not (Get-Command $candidate -CommandType Application -ErrorAction SilentlyContinue)) { continue }
    & $candidate -c 'import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)' 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $py = $candidate; break }
}
if (-not $py) { [Console]::Error.WriteLine('Orkest startup: Python 3 unavailable; upgrade deferred'); exit 0 }
$forward = @()
if ($Harness) { $forward += @('--harness', $Harness) }
$inputText = if ([Console]::IsInputRedirected) { [Console]::In.ReadToEnd() } else { '' }
$inputText | & $py -B (Join-Path $PSScriptRoot 'orkest-startup.py') @forward
exit $LASTEXITCODE

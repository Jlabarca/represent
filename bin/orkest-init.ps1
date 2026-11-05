#!/usr/bin/env pwsh
<# Initialize/reconcile this Git repository from the local distribution; dry by default.
Existing files are never blindly replaced. This entry shares startup/update ownership,
release readiness, backups, journal and migration. No network or sibling discovery.
#>
[CmdletBinding()]
param([string]$Target, [switch]$Execute, [string]$Version, [string]$GhostDevRepo, [switch]$Quiet)
$ErrorActionPreference = 'Stop'
$template = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not $Target) { $Target = $template }
$Target = (Resolve-Path -LiteralPath $Target).Path
$py = $null
foreach ($candidate in @($env:ORKEST_PYTHON, $env:GHOSTDEV_PYTHON, 'python3', 'python')) {
    if (-not $candidate -or -not (Get-Command $candidate -CommandType Application -ErrorAction SilentlyContinue)) { continue }
    & $candidate -c 'import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)' 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $py = $candidate; break }
}
if (-not $py) { Write-Error 'Orkest init requires Python 3; no files changed'; exit 2 }
$forward = @('--initialize', '--repo', $Target, '--template', $template)
if ($Execute) { $forward += '--execute' } else { $forward += '--dry' }
& $py -B (Join-Path $PSScriptRoot 'orkest-startup.py') @forward
exit $LASTEXITCODE

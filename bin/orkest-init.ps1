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
# Prefer Python 3.8+ (Update needs it); a shim that resolves to an older 3.x is used only when nothing newer exists.
foreach ($minor in 8, 0) {
    foreach ($candidate in @(@($env:ORKEST_PYTHON), @($env:GHOSTDEV_PYTHON), @('python3'), @('python'), @('py', '-3'))) {
        if (-not $candidate[0] -or -not (Get-Command $candidate[0] -CommandType Application -ErrorAction SilentlyContinue)) { continue }
        $pre = @($candidate | Select-Object -Skip 1)
        $resolved = & $candidate[0] @pre -c "import sys; print(sys.executable); sys.exit(0 if sys.version_info[0] == 3 and sys.version_info[1] in range($minor, 100) else 1)" 2>$null
        if ($LASTEXITCODE -eq 0 -and $resolved) {
            $executable = [string](@($resolved)[-1])
            $py = if ([System.IO.Path]::IsPathRooted($executable) -and (Test-Path -LiteralPath $executable -PathType Leaf)) { $executable } else { $candidate[0] }
            break
        }
    }
    if ($py) { break }
}
if (-not $py) { Write-Error 'Orkest init requires Python 3; no files changed'; exit 2 }
$forward = @('--initialize', '--repo', $Target, '--template', $template)
if ($Execute) { $forward += '--execute' } else { $forward += '--dry' }
& $py -B (Join-Path $PSScriptRoot 'orkest-startup.py') @forward
exit $LASTEXITCODE

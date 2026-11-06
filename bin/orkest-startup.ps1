#!/usr/bin/env pwsh
param([string]$Harness)
$ErrorActionPreference = 'Stop'
# Prefer Python 3.8+ (Update needs it); a shim that resolves to an older 3.x is used only when nothing newer exists.
$py = $null
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
if (-not $py) { [Console]::Error.WriteLine('Orkest startup: Python 3 unavailable; upgrade deferred'); exit 0 }
$forward = @()
if ($Harness) { $forward += @('--harness', $Harness) }
$inputText = if ([Console]::IsInputRedirected) { [Console]::In.ReadToEnd() } else { '' }
$inputText | & $py -B (Join-Path $PSScriptRoot 'orkest-startup.py') @forward
exit $LASTEXITCODE

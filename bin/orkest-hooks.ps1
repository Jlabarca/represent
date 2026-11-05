#!/usr/bin/env pwsh
# bin/orkest-hooks.ps1 -- PowerShell launcher for bin/orkest-hooks.py (twin: orkest-hooks.sh).
# Finds a Python 3 (ORKEST_PYTHON, python3, python, py -3) and forwards stdin, arguments and
# the exit code unchanged. Without Python the hook degrades to a stderr notice and exit 0
# (warn-by-default: a missing runtime never blocks the engine).
$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'orkest-hooks.py'
$candidates = @()
if (-not $env:ORKEST_PYTHON) { $env:ORKEST_PYTHON = $env:GHOSTDEV_PYTHON }
if ($env:ORKEST_PYTHON) { $candidates += , @($env:ORKEST_PYTHON) }
$candidates += , @('python3'); $candidates += , @('python'); $candidates += , @('py', '-3')
$py = $null
foreach ($c in $candidates) {
    if (-not (Get-Command $c[0] -CommandType Application -ErrorAction SilentlyContinue)) { continue }
    $pre = @($c | Select-Object -Skip 1)
    $resolvedPython = & $c[0] @pre -c 'import sys; print(sys.executable); sys.exit(0 if sys.version_info[0] == 3 else 1)' 2>$null
    if ($LASTEXITCODE -eq 0 -and $resolvedPython) {
        $executable = [string](@($resolvedPython)[-1])
        if ([System.IO.Path]::IsPathRooted($executable) -and (Test-Path -LiteralPath $executable -PathType Leaf)) {
            # ProcessStartInfo does not use PowerShell's .cmd/.bat command resolution.
            $py = @($executable)
            break
        }
    }
}
if (-not $py) {
    [Console]::Error.WriteLine('[orkest] orkest-hooks: Python 3 not found (set ORKEST_PYTHON); hook skipped')
    exit 0
}
# Forward raw stdin bytes through a child process so encoding and exit code survive intact.
$psi = [System.Diagnostics.ProcessStartInfo]::new($py[0])
foreach ($a in @($py | Select-Object -Skip 1)) { [void]$psi.ArgumentList.Add($a) }
[void]$psi.ArgumentList.Add($script)
foreach ($a in $args) { [void]$psi.ArgumentList.Add([string]$a) }
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$p = [System.Diagnostics.Process]::Start($psi)
$stdin = [Console]::OpenStandardInput()
if ([Console]::IsInputRedirected) { $stdin.CopyTo($p.StandardInput.BaseStream) }
$p.StandardInput.Close()
$p.WaitForExit()
exit $p.ExitCode

#!/usr/bin/env pwsh
# One-release startup bridge for previously installed hook wiring.
$engine = if ($env:ORKEST_ENGINE) { $env:ORKEST_ENGINE } elseif ($env:GHOSTDEV_ENGINE) { $env:GHOSTDEV_ENGINE } else { 'claude-code' }
if ($engine -eq 'claude') { $engine = 'claude-code' }
& (Join-Path $PSScriptRoot 'orkest-startup.ps1') -Harness $engine
exit $LASTEXITCODE

#!/usr/bin/env pwsh
# One-release init entry compatibility; the shared reconciler preserves local work.
& (Join-Path $PSScriptRoot 'orkest-init.ps1') @args
exit $LASTEXITCODE

#!/usr/bin/env pwsh
# One-release launcher compatibility; no duplicated policy logic.
& (Join-Path $PSScriptRoot 'orkest-hooks.ps1') @args
exit $LASTEXITCODE

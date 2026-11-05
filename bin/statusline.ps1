#!/usr/bin/env pwsh
# bin/statusline.ps1
# Custom statusLine command.
# Outputs a single line: `phase: AUTH.2.1` (or empty if no active IMPL phase).
# Reads JSON input from stdin per Claude Code statusLine contract; we ignore the model/cwd
# and just grep all *-IMPL.md files under the workspace, picking the most-recently-touched
# one with an open checkbox so the statusline grounds in actual session focus.

param(
    [string]$RepoRoot = (Resolve-Path "$PSScriptRoot/..").Path
)
# One-release process-local legacy environment fallback.
if (-not $env:ORKEST_EXTRA_IMPL_ROOTS) { $env:ORKEST_EXTRA_IMPL_ROOTS = $env:GHOSTDEV_EXTRA_IMPL_ROOTS }


$ErrorActionPreference = 'SilentlyContinue'

# Drain stdin (Claude Code sends a JSON blob; we don't currently use it)
if ([Console]::IsInputRedirected) {
    try { [void][Console]::In.ReadToEnd() } catch {}
}

if (-not (Test-Path $RepoRoot)) {
    Write-Output ""
    exit 0
}

# Recursive glob across the workspace. Exclude node_modules, build outputs, .git, and the
# impl/planned/ overflow holding pen (those are intentionally plan-only — Rule 10).
# Out-of-tree IMPLs can be added via $env:ORKEST_EXTRA_IMPL_ROOTS
# (semicolon-separated; GHOST_HARNESS_*/MAREMOTO_METHOD_* honored as legacy fallbacks). Absent by default.
$excludePattern = '[\\/](node_modules|bin|obj|\.git|\.idea|impl|orkest[\\/](done|planned|parked))[\\/]'

$implFiles = Get-ChildItem -Path $RepoRoot -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { ($_.Name -like '*-IMPL.md' -or $_.Name -like '*-ORK.md' -or $_.Name -like '*.imp.md') -and $_.FullName -notmatch $excludePattern }

# GHOSTDEV-RENAME.2: ORKEST_EXTRA_IMPL_ROOTS current; GHOST_HARNESS_*/MAREMOTO_METHOD_* legacy fallbacks.
$extraRoots = $env:ORKEST_EXTRA_IMPL_ROOTS ?? $env:GHOST_HARNESS_EXTRA_IMPL_ROOTS ?? $env:MAREMOTO_METHOD_EXTRA_IMPL_ROOTS
if ($extraRoots) {
    foreach ($extra in $extraRoots -split ';') {
        $extra = $extra.Trim()
        if ($extra -and (Test-Path $extra)) {
            $implFiles += Get-ChildItem -Path $extra -Recurse -File -ErrorAction SilentlyContinue |
                Where-Object { ($_.Name -like '*-IMPL.md' -or $_.Name -like '*-ORK.md' -or $_.Name -like '*.imp.md') -and $_.FullName -notmatch $excludePattern }
        }
    }
}

if (-not $implFiles) {
    Write-Output ""
    exit 0
}

# Most-recently-touched IMPL with an open checkbox wins. This is the proxy for "what the
# session is actually working on." Imperfect (a bookkeeping edit can re-stamp an IMPL),
# but better than alphabetical.
foreach ($impl in $implFiles | Sort-Object LastWriteTime -Descending) {
    $content = Get-Content $impl.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }

    if ($content -match '(?m)^- \[ \]\s+\*?\*?([A-Z][A-Z0-9-]*\.\d+(?:\.\d+)?)\*?\*?') {
        Write-Output "phase: $($matches[1])"
        exit 0
    }
}

Write-Output ""
exit 0

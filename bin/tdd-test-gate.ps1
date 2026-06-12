#!/usr/bin/env pwsh
# bin/tdd-test-gate.ps1
# PreToolUse hook (Edit|Write matcher) — TDD back-pressure.
# Warns/blocks a Write|Edit to an IMPLEMENTATION file when no new test symbol was
# added in the session diff. Warn-mode by default; block on GHOSTDEV_HOOK_BLOCK=1
# (or per-IMPL "block-mode: true").
# Exit: 0 allow, 1 warn (stderr, tool proceeds), 2 block (tool refused).
# Contract: bin/fixtures/tdd-gate/README.md.

param(
    [string]$RepoRoot = (Resolve-Path "$PSScriptRoot/..").Path
)

$ErrorActionPreference = 'Stop'
$logDir = Join-Path $RepoRoot 'logs/hooks'
$today = Get-Date -Format 'yyyy-MM-dd'
$logFile = Join-Path $logDir "$today.log"
function Write-HookLog {
    param([string]$Status, [string]$Message)
    if (Test-Path $logDir) {
        $stamp = (Get-Date).ToString('o')
        Add-Content -Path $logFile -Value "$stamp tdd-test-gate PreToolUse $Status $Message" -ErrorAction SilentlyContinue
    }
}

# 1. Target path: stdin JSON (.tool_input.file_path) or GHOSTDEV_TDD_TARGET override.
$target = $env:GHOSTDEV_TDD_TARGET
if (-not $target) {
    try {
        $raw = [Console]::In.ReadToEnd()
        if ($raw) { $target = ($raw | ConvertFrom-Json -ErrorAction SilentlyContinue).tool_input.file_path }
    } catch { }
}
if (-not $target) { Write-HookLog 'noop' 'no target path'; exit 0 }

# 2. Impl-path classification: code ext AND not a test path.
$norm = ($target -replace '\\', '/')
$ext = ([System.IO.Path]::GetExtension($norm)).ToLower()
$codeExts = @('.cs', '.ts', '.tsx', '.js', '.jsx', '.py')
$isTestPath = ($norm -match '(?i)(^|/)(tests?|__tests__)/') -or `
              ($norm -match '(?i)\.(test|spec)\.') -or `
              ($norm -match '(?i)(^|/)test_') -or `
              ($norm -match '(?i)_test\.')
if (($codeExts -notcontains $ext) -or $isTestPath) {
    Write-HookLog 'noop' "non-impl: $target"; exit 0
}

# 3. Active-IMPL gate. Skipped in test mode (explicit diff file).
$blockModeImpl = $false
if (-not $env:GHOSTDEV_TDD_DIFF_FILE) {
    $implDir = Join-Path $RepoRoot 'docs'
    $activeImpl = $null
    if (Test-Path $implDir) {
        foreach ($f in Get-ChildItem -Path $implDir -Filter '*-IMPL.md' -ErrorAction SilentlyContinue) {
            $c = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
            if ($c -match '(?m)^- \[ \]') {
                $activeImpl = $f.Name
                if ($c -match '(?m)^>\s*block-mode:\s*true\s*$') { $blockModeImpl = $true }
                break
            }
        }
    }
    if (-not $activeImpl) { Write-HookLog 'noop' 'no active IMPL phase'; exit 0 }
}

# 4. Session diff: explicit file (tests) or git diff since base (HEAD, or GHOSTDEV_TDD_BASE_REF).
$diff = ''
if ($env:GHOSTDEV_TDD_DIFF_FILE -and (Test-Path $env:GHOSTDEV_TDD_DIFF_FILE)) {
    $diff = Get-Content $env:GHOSTDEV_TDD_DIFF_FILE -Raw
}
else {
    $base = $env:GHOSTDEV_TDD_BASE_REF; if (-not $base) { $base = 'HEAD' }
    try {
        Push-Location $RepoRoot
        $diff = ((& git diff $base 2>$null) -join "`n") + "`n" + ((& git diff --cached 2>$null) -join "`n")
    }
    catch { } finally { Pop-Location }
}

# 5. New test symbol on an added (+) line?
$testSym = '(\bit\(|\bdescribe\(|\btest\(|\[Test\]|\[Fact\]|\bdef test_)'
$hasTest = $false
foreach ($ln in ($diff -split "`n")) {
    if ($ln.StartsWith('+') -and -not $ln.StartsWith('+++')) {
        if ($ln -match $testSym) { $hasTest = $true; break }
    }
}
if ($hasTest) { Write-HookLog 'allow' "$target (test symbol present)"; exit 0 }

# 6. Violation — warn (1) or block (2).
$shouldBlock = ($env:GHOSTDEV_HOOK_BLOCK -eq '1') -or $blockModeImpl
$msg = "[tdd-gate] $target - no new test symbol in the session diff. Test-first not satisfied: add a failing test (Red), then the implementation (Green)."
if ($shouldBlock) {
    [Console]::Error.WriteLine("$msg [BLOCK]")
    Write-HookLog 'block' "$target"
    exit 2
}
else {
    [Console]::Error.WriteLine("$msg [warn]")
    Write-HookLog 'warn' "$target"
    exit 1
}

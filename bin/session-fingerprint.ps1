#!/usr/bin/env pwsh
# bin/session-fingerprint.ps1
# PostToolUse hook (Edit|Write matcher; Codex apply_patch via bin/ghostdev-hooks.py).
#
# WHY THIS EXISTS. The step <-> session <-> git tri-link rests on `git.trace` records in
# the run rail ({RepoRoot}/.runs). Unattended runners write them; hand-run sessions never
# did, so the strongest evidence path covered almost none of the actual work. This hook is
# the hand-run writer.
#
# CONTRACT -- deliberately narrow:
#   * ALWAYS exits 0. PostToolUse: the tool already ran; a non-zero exit only adds noise.
#   * `shas` is ALWAYS empty, by construction: it fires on an edit, never a commit --
#     precisely the "edited, uncommitted" case. "Committed nothing" is evidence; a
#     missing record is not.
#   * Every git field degrades INDEPENDENTLY to empty (non-repo, detached HEAD, no git).
#   * One record PER SESSION, merged: a second edit unions into `filesChanged`.
#
# SESSION ID: stdin payload `.session_id` first, then ORKEST_SESSION_ID,
# CLAUDE_CODE_SESSION_ID, GROK_SESSION_ID.
#
# Exit: 0, always. Twin: bin/session-fingerprint.sh.

param(
    [string]$RepoRoot = (Resolve-Path "$PSScriptRoot/..").Path
)
# One-release process-local legacy environment fallback.
if (-not $env:ORKEST_FINGERPRINT_TARGET) { $env:ORKEST_FINGERPRINT_TARGET = $env:GHOSTDEV_FINGERPRINT_TARGET }
if (-not $env:ORKEST_SESSION_ID) { $env:ORKEST_SESSION_ID = $env:GHOSTDEV_SESSION_ID }
if (-not $env:ORKEST_STATE_DIR) { $env:ORKEST_STATE_DIR = $env:GHOSTDEV_STATE_DIR }


$ErrorActionPreference = 'Continue'

$logDir = Join-Path $RepoRoot 'logs/hooks'
$logFile = Join-Path $logDir ((Get-Date -Format 'yyyy-MM-dd') + '.log')
function Write-HookLog {
    param([string]$Status, [string]$Message)
    if (Test-Path $logDir) {
        $stamp = (Get-Date).ToString('o')
        Add-Content -Path $logFile -Value "$stamp session-fingerprint PostToolUse $Status $Message" -ErrorAction SilentlyContinue
    }
}

# ---- 1. Payload: target path + session id -------------------------------------
$target = $env:ORKEST_FINGERPRINT_TARGET
$sessionId = $null
try {
    $raw = [Console]::In.ReadToEnd()
    if ($raw) {
        $j = $raw | ConvertFrom-Json -ErrorAction SilentlyContinue
        if (-not $target -and $j.tool_input.file_path) { $target = $j.tool_input.file_path }
        if ($j.session_id) { $sessionId = $j.session_id }
    }
} catch { }
if (-not $sessionId) { $sessionId = $env:ORKEST_SESSION_ID }
if (-not $sessionId) { $sessionId = $env:CLAUDE_CODE_SESSION_ID }
if (-not $sessionId) { $sessionId = $env:GROK_SESSION_ID }

# No session id => no key to file the record under. A record we cannot attribute is
# worse than no record: it would read as evidence for whichever session looked at it.
if (-not $sessionId) { Write-HookLog 'noop' 'no session id'; exit 0 }
if (-not $target) { Write-HookLog 'noop' 'no target path'; exit 0 }

# Session ids key a filename. Refuse anything that is not the id-shaped charset rather
# than sanitizing it — a mangled id silently splits one session across two records.
if ($sessionId -notmatch '^[A-Za-z0-9._-]+$') { Write-HookLog 'noop' 'non-id-shaped session id'; exit 0 }

# ---- 2. State dir: ORKEST_STATE_DIR, else {RepoRoot}/.runs -------------------
$stateDir = $env:ORKEST_STATE_DIR
if (-not $stateDir) { $stateDir = Join-Path $RepoRoot '.runs' }
if (-not (Test-Path $stateDir)) {
    try { New-Item -ItemType Directory -Force -Path $stateDir | Out-Null } catch { Write-HookLog 'noop' 'state dir unwritable'; exit 0 }
}
$recordPath = Join-Path $stateDir "session-$sessionId.jsonl"

# ---- 3. Git interrogation — each field degrades independently ------------------
function Invoke-Git {
    param([string[]]$GitArgs)
    try {
        $out = & git -C $RepoRoot @GitArgs 2>$null
        if ($LASTEXITCODE -ne 0) { return '' }
        return (($out | Out-String).Trim())
    } catch { return '' }
}

$branch = Invoke-Git @('rev-parse', '--abbrev-ref', 'HEAD')
# A detached HEAD reports the literal string "HEAD"; record empty rather than a
# branch name that does not exist.
if ($branch -eq 'HEAD') { $branch = '' }
$endRef = Invoke-Git @('rev-parse', 'HEAD')
$baseRef = $endRef   # a hand-run session has no dispatch-time base; HEAD is the honest anchor

# ---- 4. Merge into the session's single record ---------------------------------
$files = New-Object System.Collections.Generic.List[string]
$normTarget = ($target -replace '\\', '/')
if (Test-Path $recordPath) {
    try {
        $prevLine = (Get-Content $recordPath -Raw -ErrorAction SilentlyContinue)
        if ($prevLine) {
            $prev = ($prevLine -split "`n" | Where-Object { $_.Trim() } | Select-Object -Last 1) | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($prev -and $prev.filesChanged) { foreach ($f in $prev.filesChanged) { [void]$files.Add([string]$f) } }
        }
    } catch { }
}
if (-not $files.Contains($normTarget)) { [void]$files.Add($normTarget) }

$ts = (Get-Date).ToUniversalTime().ToString('o')
$record = [ordered]@{
    kind         = 'git.trace'
    sessionId    = $sessionId
    baseRef      = $baseRef
    endRef       = $endRef
    branch       = $branch
    shas         = @()
    filesChanged = @($files)
    source       = 'session-fingerprint'
    ts           = $ts
    At           = $ts   # the timestamp key run-rail readers use
}

try {
    # Rewrite, not append: this file holds exactly one merged record per session.
    Set-Content -Path $recordPath -Value ($record | ConvertTo-Json -Compress -Depth 5) -Encoding utf8 -ErrorAction Stop
    Write-HookLog 'wrote' "$sessionId files=$($files.Count)"
} catch {
    Write-HookLog 'noop' "unwritable: $recordPath"
}

exit 0

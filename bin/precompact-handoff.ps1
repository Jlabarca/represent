#!/usr/bin/env pwsh
# bin/precompact-handoff.ps1
# PreCompact hook (CC-NATIVE-WINS.1 + DISCIPLINE-HARDENING.5). Before Claude Code
# compacts context, (a) snapshot the transcript to a stable gitignored location, and
# (b) AUTO-AUTHOR a topic-keyed $handoffRoot/<FEATURE>.md from on-disk state so the
# next session resumes without the operator remembering the ~120k smart-zone limit.
# Deterministic (a hook can't LLM-compress) — a structured snapshot, not the smart
# /handoff artifact, but far better than a bare nudge. ALWAYS exits 0; never blocks.
$ErrorActionPreference = 'SilentlyContinue'

$raw = ''
try { $raw = [Console]::In.ReadToEnd() } catch { }
$j = $null
try { $j = $raw | ConvertFrom-Json -ErrorAction Stop } catch { $j = $null }

$tp = if ($j) { $j.transcript_path } else { $null }
$trigger = if ($j -and $j.trigger) { $j.trigger } else { 'unknown' }
$cwd = (Resolve-Path "$PSScriptRoot/..").Path   # repo root, not the session cwd: a session opened in docs/ must not grow docs/docs/handoffs

$recordRoot = if (Test-Path (Join-Path $cwd 'docs/orkest')) { 'docs/orkest' } else { 'docs' }
$handoffRoot = "$recordRoot/handoffs"
$logbookPath = "$recordRoot/LOGBOOK.md"
$hd = Join-Path $cwd $handoffRoot
if (-not (Test-Path $hd)) { New-Item -ItemType Directory -Force -Path $hd | Out-Null }
$stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')

# (a) Backstop snapshot (unchanged behavior).
if ($tp -and (Test-Path $tp)) {
    Copy-Item -Path $tp -Destination (Join-Path $hd 'precompact-backstop.jsonl') -Force -ErrorAction SilentlyContinue
}
$note = @"
# PreCompact backstop

> Auto-written by bin/precompact-handoff on context compaction. A deterministic safety
> net, NOT the smart /handoff artifact (a hook can't LLM-compress).

- when:       $stamp
- trigger:    $trigger compaction
- transcript: $tp
- snapshot:   $handoffRoot/precompact-backstop.jsonl (copy of the pre-compaction transcript)
"@
Set-Content -Path (Join-Path $hd 'precompact-backstop.md') -Value $note -ErrorAction SilentlyContinue

# (b) Auto-author $handoffRoot/<FEATURE>.md from on-disk state.
#     FEATURE = first *-IMPL.md (most-recently-written) with an unchecked box.
$feature = $null; $activePhase = $null; $implPath = $null
$implFiles = @(Get-ChildItem -Path (Join-Path $cwd 'docs') -Filter '*-IMPL.md' -File -ErrorAction SilentlyContinue; Get-ChildItem -Path (Join-Path $cwd 'docs/orkest') -Filter '*-ORK.md' -File -ErrorAction SilentlyContinue; Get-ChildItem -Path (Join-Path $cwd 'docs/orkest') -Filter '*.imp.md' -File -ErrorAction SilentlyContinue)
foreach ($impl in ($implFiles | Sort-Object LastWriteTime -Descending)) {
    $content = Get-Content $impl.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    if ($content -match '(?m)^- \[ \]\s+\*?\*?([A-Z][A-Z0-9-]*\.\d+(?:\.\d+)?)\*?\*?\s+[—\-]\s+(.+)$') {
        $feature = ($impl.Name -replace '(-(IMPL|ORK)|\.imp)\.md$', '')
        $activePhase = "$($matches[1]) — $($matches[2].Trim())"
        $implPath = $impl.FullName.Substring($cwd.Length + 1).Replace('\', '/')
        break
    }
}

if ($feature) {
    # LOGBOOK tail (last entry) + git diff stat since HEAD — the "what just happened".
    $logTail = ''
    $logbook = Join-Path $cwd $logbookPath
    if (Test-Path $logbook) {
        $lines = Get-Content $logbook -ErrorAction SilentlyContinue
        $idx = ($lines | Select-String -Pattern '^## ' | Select-Object -First 1).LineNumber
        if ($idx) { $logTail = ($lines[($idx - 1)..([Math]::Min($idx + 14, $lines.Count - 1))] -join "`n") }
    }
    $gitStat = ''
    try { Push-Location $cwd; $gitStat = ((& git diff --stat HEAD 2>$null) -join "`n"); Pop-Location } catch { }

    $handoff = @"
# Handoff — $feature

> Auto-authored by bin/precompact-handoff at $stamp (context compaction, $trigger).
> Deterministic snapshot of on-disk state — NOT an LLM-compressed /handoff. Re-run
> /handoff for a richer resume. Overwritten on each compaction (topic-keyed).

## Read first
1. $implPath — the active tracker
2. $logbookPath — latest entry (excerpt below)
3. docs/CONTEXT.md — living state

## You are here
- Active phase: **$activePhase**
- IMPL: $implPath

## Latest LOGBOOK entry
$logTail

## Uncommitted work (git diff --stat HEAD)
``````
$gitStat
``````

## Resume prompt
Continue $feature from the first unchecked box ($activePhase). Read the IMPL + the
LOGBOOK excerpt above, verify the uncommitted diff, then proceed.
"@
    Set-Content -Path (Join-Path $hd "$feature.md") -Value $handoff -ErrorAction SilentlyContinue
    [Console]::Error.WriteLine("[precompact] context compacting ($trigger) - auto-authored $handoffRoot/$feature.md + backstop. Next session resumes from $activePhase.")
}
else {
    [Console]::Error.WriteLine("[precompact] context compacting ($trigger) - snapshot saved to $handoffRoot/precompact-backstop.*; run /handoff for a compressed resume.")
}

exit 0

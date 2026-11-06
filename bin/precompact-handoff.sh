#!/usr/bin/env bash
# bin/precompact-handoff.sh
# PreCompact hook (CC-NATIVE-WINS.1 + DISCIPLINE-HARDENING.5) — POSIX twin of the .ps1.
# (a) snapshot the transcript to a gitignored backstop AND (b) auto-author a topic-keyed
# $handoff_root/<FEATURE>.md from on-disk state (active IMPL + phase + LOGBOOK tail + diff)
# so the next session resumes without the operator remembering /handoff. Deterministic
# snapshot, not an LLM-compressed artifact. ALWAYS exits 0; never blocks compaction.
input=$(cat 2>/dev/null)

field() { printf '%s' "$input" | grep -o "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -n1 | sed 's/.*:[[:space:]]*"//;s/"$//'; }
tp=$(field transcript_path)
trigger=$(field trigger)
[ -z "$trigger" ] && trigger=unknown
cwd="$(cd "$(dirname "$0")/.." && pwd)"   # repo root, not the session cwd: a session opened in docs/ must not grow docs/docs/handoffs

record_root="docs"
[ -d "$cwd/docs/orkest" ] && record_root="docs/orkest"
handoff_root="$record_root/handoffs"
logbook_path="$record_root/LOGBOOK.md"
hd="$cwd/$handoff_root"
mkdir -p "$hd" 2>/dev/null
stamp=$(date '+%Y-%m-%d %H:%M:%S')

# (a) Backstop snapshot (unchanged).
if [ -n "$tp" ] && [ -f "$tp" ]; then cp -f "$tp" "$hd/precompact-backstop.jsonl" 2>/dev/null; fi
cat > "$hd/precompact-backstop.md" 2>/dev/null <<EOF
# PreCompact backstop

> Auto-written by bin/precompact-handoff on context compaction. A deterministic safety
> net, NOT the smart /handoff artifact (a hook can't LLM-compress).

- when:       $stamp
- trigger:    $trigger compaction
- transcript: $tp
- snapshot:   $handoff_root/precompact-backstop.jsonl (copy of the pre-compaction transcript)
EOF

# Live gates and the run lock: recorded facts only, best effort (a missing Python never blocks compaction).
live_md=""
for py in "${ORKEST_PYTHON:-${GHOSTDEV_PYTHON:-}}" python3 python; do
  [ -n "$py" ] || continue
  if command -v "$py" >/dev/null 2>&1 && "$py" -c 'import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)' >/dev/null 2>&1; then
    live_md=$(LANG=C.UTF-8 "$py" -X utf8 "$cwd/bin/orkest_gate.py" handoff "$cwd" 2>/dev/null)
    break
  fi
done
[ -n "$live_md" ] && printf '\n%s\n' "$live_md" >> "$hd/precompact-backstop.md" 2>/dev/null

# (b) Auto-author $handoff_root/<FEATURE>.md from on-disk state.
feature=""; active_phase=""; impl_path=""
while IFS= read -r f; do
  [ -f "$f" ] || continue;
  line=$(grep -En '^- \[ \]' "$f" | head -n1 | sed 's/^[0-9]*://')
  [ -z "$line" ] && continue
  feature=$(basename "$f" | sed -E 's/(-(IMPL|ORK)|\.imp)\.md$//')
  impl_path="${f#"$cwd"/}"
  # Extract "PHASE.N.N — desc" (tolerate **bold** + em/hyphen dashes; (—|-) not [—-], so it is byte-safe in the C locale).
  active_phase=$(printf '%s' "$line" | sed -E 's/^- \[ \][[:space:]]*\*{0,2}([A-Z][A-Z0-9-]*\.[0-9]+(\.[0-9]+)?)\*{0,2}[[:space:]]*(—|-)?[[:space:]]*(.*)$/\1 — \4/')
  break
done < <({ find "$cwd/docs" -maxdepth 1 -type f -name '*-IMPL.md' 2>/dev/null; find "$cwd/docs/orkest" -maxdepth 1 -type f \( -name '*-ORK.md' -o -name '*.imp.md' \) 2>/dev/null || true; } |
  while IFS= read -r file; do printf '%s|%s\n' "$(stat -c '%Y' "$file" 2>/dev/null || stat -f '%m' "$file")" "$file"; done |
  sort -t'|' -k1 -n -r | cut -d'|' -f2-)

if [ -n "$feature" ]; then
  log_tail=""
  if [ -f "$cwd/$logbook_path" ]; then
    start=$(grep -n '^## ' "$cwd/$logbook_path" | head -n1 | cut -d: -f1)
    [ -n "$start" ] && log_tail=$(sed -n "${start},$((start + 14))p" "$cwd/$logbook_path")
  fi
  git_stat=$(cd "$cwd" && git diff --stat HEAD 2>/dev/null)

  cat > "$hd/$feature.md" 2>/dev/null <<EOF
# Handoff — $feature

> Auto-authored by bin/precompact-handoff at $stamp (context compaction, $trigger).
> Deterministic snapshot of on-disk state — NOT an LLM-compressed /handoff. Re-run
> /handoff for a richer resume. Overwritten on each compaction (topic-keyed).

## Read first
1. $impl_path — the active tracker
2. $logbook_path — latest entry (excerpt below)
3. docs/CONTEXT.md — living state

## You are here
- Active phase: **$active_phase**
- IMPL: $impl_path

## Latest LOGBOOK entry
$log_tail

## Uncommitted work (git diff --stat HEAD)
\`\`\`
$git_stat
\`\`\`

$live_md

## Resume prompt
Continue $feature from the first unchecked box ($active_phase). Read the IMPL + the
LOGBOOK excerpt above, verify the uncommitted diff, then proceed. If gates are listed
above, wait for them instead of relaunching their commands.
EOF
  echo "[precompact] context compacting ($trigger) - auto-authored $handoff_root/$feature.md + backstop. Next session resumes from $active_phase." >&2
else
  echo "[precompact] context compacting ($trigger) - snapshot saved to $handoff_root/precompact-backstop.*; run /handoff for a compressed resume." >&2
fi

exit 0

#!/usr/bin/env bash
# bin/declare-session-state.sh
# SessionEnd hook — POSIX twin of the .ps1.
#
# Writes the producer-declared state sidecar `{transcript}.ghost-state.json`
# ({"state","evidence"}) next to the session transcript. The sessions surface
# reads it at harvest time and reports that state with `proven: true`, which the
# cockpit renders SOLID instead of the dashed heuristic ring.
#
# WHY SessionEnd AND NOT Stop: a Stop hook fires every time the assistant
# finishes a turn, and "the assistant stopped" does NOT prove "the operator owes
# a reply" — most turns end with work delivered and nothing owed. Declaring
# awaiting-input on every Stop would flood the needs-you lane with a confident
# lie. SessionEnd proves exactly one thing, and proves it completely: this
# session is closed, therefore it is not live. That is worth declaring, because
# the heuristic counts any session touched in the last 24h as live — a session
# the operator closed five minutes ago reads as live until the window expires.
#
# Only ever declares `idle`. Whether the WORK finished is not knowable here, so
# `done` is deliberately never declared. ALWAYS exits 0; never blocks teardown.
input=$(cat 2>/dev/null)

field() { printf '%s' "$input" | grep -o "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -n1 | sed 's/.*:[[:space:]]*"//;s/"$//'; }
tp=$(field transcript_path)
reason=$(field reason)
[ -z "$reason" ] && reason=other

# No transcript path (or it vanished) → nothing to sit beside. Silent no-op.
[ -z "$tp" ] && exit 0

sidecar="${tp%.jsonl}.ghost-state.json"
stamp=$(date -Iseconds 2>/dev/null || date)

# Escape the two characters that could break the JSON string literal.
esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

cat > "$sidecar" 2>/dev/null <<EOF
{
  "state": "idle",
  "evidence": "session closed at $(esc "$stamp") (SessionEnd: $(esc "$reason")) - declared by bin/declare-session-state",
  "declaredBy": "ghostdev/declare-session-state",
  "declaredAt": "$(esc "$stamp")"
}
EOF

exit 0

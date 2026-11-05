#!/usr/bin/env bash

# One-release legacy environment fallback.
export ORKEST_FINGERPRINT_TARGET="${ORKEST_FINGERPRINT_TARGET:-${GHOSTDEV_FINGERPRINT_TARGET:-}}"
export ORKEST_SESSION_ID="${ORKEST_SESSION_ID:-${GHOSTDEV_SESSION_ID:-}}"
export ORKEST_STATE_DIR="${ORKEST_STATE_DIR:-${GHOSTDEV_STATE_DIR:-}}"
# bin/session-fingerprint.sh — POSIX twin of session-fingerprint.ps1. Same contract, field for field:
#   * always exits 0 (PostToolUse: the tool already ran; a non-zero exit only adds noise)
#   * `shas` is always [] by construction — this fires on an edit, never a commit, which
#     is exactly the "edited, uncommitted" case OQ-3b rules T1 proven
#   * every git field degrades independently to empty
#   * one merged record per session; a second edit unions into filesChanged
# Session id: stdin JSON `.session_id` first, then ORKEST_SESSION_ID, CLAUDE_CODE_SESSION_ID, GROK_SESSION_ID.
set -u

REPO_ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
LOG_DIR="$REPO_ROOT/logs/hooks"
LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d).log"
log() { [ -d "$LOG_DIR" ] && printf '%s session-fingerprint PostToolUse %s %s\n' "$(date -Iseconds 2>/dev/null || date)" "$1" "$2" >>"$LOG_FILE" 2>/dev/null; return 0; }

# ---- 1. Payload: target path + session id -------------------------------------
TARGET="${ORKEST_FINGERPRINT_TARGET:-}"
SESSION_ID=""
RAW="$(cat 2>/dev/null || true)"
if [ -n "$RAW" ]; then
  [ -z "$TARGET" ] && TARGET="$(printf '%s' "$RAW" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"//; s/"$//')"
  SESSION_ID="$(printf '%s' "$RAW" | grep -o '"session_id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"session_id"[[:space:]]*:[[:space:]]*"//; s/"$//')"
fi
[ -z "$SESSION_ID" ] && SESSION_ID="${ORKEST_SESSION_ID:-${CLAUDE_CODE_SESSION_ID:-${GROK_SESSION_ID:-}}}"

# A record we cannot attribute is worse than no record — it would read as evidence
# for whichever session happened to look at it.
[ -z "$SESSION_ID" ] && { log noop 'no session id'; exit 0; }
[ -z "$TARGET" ] && { log noop 'no target path'; exit 0; }

# Refuse a non-id-shaped id rather than sanitizing: a mangled id silently splits one
# session across two records.
printf '%s' "$SESSION_ID" | grep -Eq '^[A-Za-z0-9._-]+$' || { log noop 'non-id-shaped session id'; exit 0; }

# ---- 2. State dir: ORKEST_STATE_DIR, else {RepoRoot}/.runs -------------------
STATE_DIR="${ORKEST_STATE_DIR:-$REPO_ROOT/.runs}"
mkdir -p "$STATE_DIR" 2>/dev/null || { log noop 'state dir unwritable'; exit 0; }
RECORD="$STATE_DIR/session-$SESSION_ID.jsonl"

# ---- 3. Git interrogation — each field degrades independently ------------------
BRANCH="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
# Detached HEAD reports the literal "HEAD"; record empty rather than a branch that
# does not exist.
[ "$BRANCH" = "HEAD" ] && BRANCH=""
END_REF="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || true)"
BASE_REF="$END_REF"   # a hand-run session has no dispatch-time base; HEAD is the honest anchor

# ---- 4. Merge into the session's single record ---------------------------------
NORM_TARGET="$(printf '%s' "$TARGET" | tr '\\' '/')"
PREV_FILES=""
if [ -f "$RECORD" ]; then
  PREV_FILES="$(sed -n 's/.*"filesChanged"[[:space:]]*:[[:space:]]*\[\([^]]*\)\].*/\1/p' "$RECORD" | tail -1)"
fi

# Build the filesChanged array, de-duplicated, preserving prior order.
FILES_JSON=""
add_file() {
  case ",$FILES_JSON," in *"\"$1\""*) return 0 ;; esac
  [ -n "$FILES_JSON" ] && FILES_JSON="$FILES_JSON,"
  FILES_JSON="$FILES_JSON\"$1\""
}
if [ -n "$PREV_FILES" ]; then
  OLD_IFS="$IFS"; IFS=','
  for f in $PREV_FILES; do
    f="$(printf '%s' "$f" | sed 's/^[[:space:]]*"//; s/"[[:space:]]*$//')"
    [ -n "$f" ] && add_file "$f"
  done
  IFS="$OLD_IFS"
fi
add_file "$NORM_TARGET"

# `At` (== ts) is the timestamp key run-rail readers use; `ts` alone reads as timestamp-less.
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date)"
# Rewrite, not append: this file holds exactly one merged record per session.
printf '{"kind":"git.trace","sessionId":"%s","baseRef":"%s","endRef":"%s","branch":"%s","shas":[],"filesChanged":[%s],"source":"session-fingerprint","ts":"%s","At":"%s"}\n' \
  "$SESSION_ID" "$BASE_REF" "$END_REF" "$BRANCH" "$FILES_JSON" "$TS" "$TS" > "$RECORD" 2>/dev/null \
  && log wrote "$SESSION_ID" || log noop "unwritable: $RECORD"

exit 0

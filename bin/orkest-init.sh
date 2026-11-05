#!/usr/bin/env bash
# Same local release/ownership/journal contract as the PowerShell twin.
dir="$(cd "$(dirname "$0")" && pwd)"
template="$(cd "$dir/.." && pwd)"
target="$template"
execute=0
while [ $# -gt 0 ]; do
  case "$1" in
    --target) target="$2"; shift 2 ;;
    --execute) execute=1; shift ;;
    --quiet) shift ;;
    --version|--ghostdev-repo) shift 2 ;; # accepted legacy inputs cannot override release readiness
    *) echo "Unknown init option: $1" >&2; exit 2 ;;
  esac
done
for py in "${ORKEST_PYTHON:-${GHOSTDEV_PYTHON:-}}" python3 python; do
  [ -n "$py" ] || continue
  if command -v "$py" >/dev/null 2>&1 && "$py" -c 'import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)' >/dev/null 2>&1; then
    flags=(--dry)
    [ "$execute" -eq 0 ] || flags=(--execute)
    exec "$py" -B "$dir/orkest-startup.py" --initialize --repo "$target" --template "$template" "${flags[@]}"
  fi
done
echo 'Orkest init requires Python 3; no files changed' >&2
exit 2

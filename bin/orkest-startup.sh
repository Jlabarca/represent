#!/usr/bin/env bash
dir="$(cd "$(dirname "$0")" && pwd)"
for py in "${ORKEST_PYTHON:-${GHOSTDEV_PYTHON:-}}" python3 python; do
  [ -n "$py" ] || continue
  if command -v "$py" >/dev/null 2>&1 && "$py" -c 'import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)' >/dev/null 2>&1; then
    exec "$py" -B "$dir/orkest-startup.py" "$@"
  fi
done
echo 'Orkest startup: Python 3 unavailable; upgrade deferred' >&2
exit 0

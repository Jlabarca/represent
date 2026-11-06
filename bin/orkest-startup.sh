#!/usr/bin/env bash
dir="$(cd "$(dirname "$0")" && pwd)"
# Prefer Python 3.8+ (Update needs it); an older 3.x is used only when nothing newer exists.
for minor in 8 0; do
  for py in "${ORKEST_PYTHON:-${GHOSTDEV_PYTHON:-}}" python3 python; do
    [ -n "$py" ] || continue
    if command -v "$py" >/dev/null 2>&1 && "$py" -c "import sys; sys.exit(0 if sys.version_info[0] == 3 and sys.version_info[1] in range($minor, 100) else 1)" >/dev/null 2>&1; then
      exec "$py" -B "$dir/orkest-startup.py" "$@"
    fi
  done
done
echo 'Orkest startup: Python 3 unavailable; upgrade deferred' >&2
exit 0

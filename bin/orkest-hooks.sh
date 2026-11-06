#!/usr/bin/env bash
# bin/orkest-hooks.sh -- POSIX launcher for bin/orkest-hooks.py (twin: orkest-hooks.ps1).
# Finds a Python 3 (ORKEST_PYTHON, python3, python) and forwards stdin, arguments and the
# exit code unchanged. Without Python the hook degrades to a stderr notice and exit 0
# (warn-by-default: a missing runtime never blocks the engine).
dir="$(cd "$(dirname "$0")" && pwd)"
for minor in 8 0; do
  for py in "${ORKEST_PYTHON:-${GHOSTDEV_PYTHON:-}}" python3 python; do
    [ -n "$py" ] || continue
    if command -v "$py" >/dev/null 2>&1 && "$py" -c "import sys; sys.exit(0 if sys.version_info[0] == 3 and sys.version_info[1] in range($minor, 100) else 1)" >/dev/null 2>&1; then
      exec "$py" "$dir/orkest-hooks.py" "$@"
    fi
  done
done
echo "[orkest] orkest-hooks: Python 3 not found (set ORKEST_PYTHON); hook skipped" >&2
exit 0

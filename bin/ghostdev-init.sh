#!/usr/bin/env bash
# One-release init entry compatibility; no duplicate seed/overwrite lifecycle.
dir="$(cd "$(dirname "$0")" && pwd)"
exec bash "$dir/orkest-init.sh" "$@"

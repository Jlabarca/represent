#!/usr/bin/env bash
# One-release launcher compatibility; no duplicated policy logic.
dir="$(cd "$(dirname "$0")" && pwd)"
exec bash "$dir/orkest-hooks.sh" "$@"

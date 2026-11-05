#!/usr/bin/env bash
# One-release startup bridge for previously installed hook wiring.
dir="$(cd "$(dirname "$0")" && pwd)"
engine="${ORKEST_ENGINE:-${GHOSTDEV_ENGINE:-claude-code}}"
[ "$engine" != claude ] || engine=claude-code
exec bash "$dir/orkest-startup.sh" --harness "$engine"

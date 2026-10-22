#!/usr/bin/env bash
# macOS entry point for the terminal tarball. The Unix tarball script
# already names artifacts by host (darwin-arm64), so this wrapper exists
# only so the per-OS packaging matrix names macOS explicitly.
#
#   bash maze-chase/packaging/terminal/macos-tarball.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$HERE/linux-tarball.sh" "$@"

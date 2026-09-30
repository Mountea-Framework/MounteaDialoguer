#!/usr/bin/env bash
set -euo pipefail
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$REPO_DIR/scripts/steam-upload.mjs" --platform linux "$@"

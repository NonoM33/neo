#!/usr/bin/env bash
# Configure git to use the versioned hooks in scripts/git-hooks/.
# Run once per clone (mac mini, CI, fresh checkouts):
#   bash scripts/install-hooks.sh

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="scripts/git-hooks"

cd "$REPO_ROOT"

chmod +x "$HOOKS_DIR"/* 2>/dev/null || true
git config core.hooksPath "$HOOKS_DIR"

echo "✅ Git hooks installed (core.hooksPath = $HOOKS_DIR)"
echo "   Active hooks:"
ls -1 "$HOOKS_DIR" | sed 's/^/     - /'

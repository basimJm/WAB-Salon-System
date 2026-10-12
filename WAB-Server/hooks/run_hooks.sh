#!/bin/bash
# run_hooks.sh — Execute all pre-close-session hooks
# Run this BEFORE closing a session to sync docs with current code.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "========================================"
echo "  Running pre-close-session hooks..."
echo "========================================"
echo ""

# Hook 1: Update Postman collection
echo "[1/2] Updating Postman collection..."
node "$SCRIPT_DIR/update_postman.js"
echo ""

# Hook 2: Update BRD.md
echo "[2/2] Updating BRD..."
node "$SCRIPT_DIR/update_brd.js"
echo ""

echo "========================================"
echo "  ✓ All hooks completed successfully"
echo "========================================"

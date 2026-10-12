#!/usr/bin/env bash
# The same gates CI runs, for use before every commit (CLAUDE.md §1.6, §8).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

echo "== Policy script tests"
python3 -m unittest discover -s scripts/ci/tests -p 'test_*.py'
echo "== Policy checks (hardcoded, file length, localization, variants, quality, security)"
python3 scripts/ci/policy_checks.py all
echo "== detekt + Compose rules"
scripts/ci/run_detekt.sh

if [ -n "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ] && [ -x ./gradlew ]; then
  echo "== Gradle: unit tests and every Android variant"
  ./gradlew testAndroidHostTest assembleDevDebug assembleDevRelease assembleProdDebug assembleProdRelease \
    lintDevDebug lintDevRelease lintProdDebug lintProdRelease
else
  echo "Android SDK not found: Gradle checks are skipped here; CI runs them."
fi

"""Analytics coverage (MER-051, PRD §14): every feature screen reports a `screen_view` through `TrackScreen`, event
names are Firebase-safe, and the PRD events of the shipped features are declared somewhere in the app."""
from __future__ import annotations

import re
from pathlib import Path

from .files import Config
from .model import Violation

SCREEN = "A001"
NAME = "A002"
MISSING = "A003"

_SCREEN_GLOB = "feature/*/presentation/src/commonMain/kotlin/**/screen/*.kt"
_ANALYTICS_GLOBS = ("feature/*/presentation/src/commonMain/kotlin/**/analytics/*.kt", "composeApp/src/commonMain/kotlin/**/analytics/*.kt")
_SCREEN_FUN = re.compile(r"^@Composable\s*\nfun ([A-Z]\w*Screen)\(", re.M)
_EVENT = re.compile(r'const val ACTION_\w+ = "([^"]*)"')
_VALID_NAME = re.compile(r"^[a-z][a-z0-9_]{0,39}$")


def screens_without_tracking(text: str) -> list[str]:
    """Public screen composables of a file that never call `TrackScreen(`."""
    return [] if "TrackScreen(" in text else _SCREEN_FUN.findall(text)


def event_names(text: str) -> list[str]:
    return _EVENT.findall(text)


def check(config: Config) -> list[Violation]:
    root: Path = config.root
    found: list[Violation] = []
    for path in sorted(root.glob(_SCREEN_GLOB)):
        rel = str(path.relative_to(root))
        for name in screens_without_tracking(path.read_text(encoding="utf-8")):
            found.append(Violation(rel, 1, SCREEN, f"{name} does not call TrackScreen (PRD §14 screen_view)"))
    declared: set[str] = set()
    for glob in _ANALYTICS_GLOBS:
        for path in sorted(root.glob(glob)):
            rel = str(path.relative_to(root))
            for name in event_names(path.read_text(encoding="utf-8")):
                declared.add(name)
                if not _VALID_NAME.match(name):
                    found.append(Violation(rel, 1, NAME, f"event '{name}' must be snake_case, start with a letter, ≤ 40 chars"))
    for name in config.data.get("analytics", {}).get("requiredEvents", []):
        if name not in declared:
            found.append(Violation("config/policy.json", 1, MISSING, f"PRD §14 event '{name}' is not declared by any feature"))
    return found

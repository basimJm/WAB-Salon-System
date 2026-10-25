"""Navigation coverage: every `Screen` / `Graph` the app navigates to is registered in a nav graph (`composable<Screen.X>`,
`navigation<Graph.X>`). Navigating to an unregistered route crashes at runtime (found by the end-of-backlog journey)."""
from __future__ import annotations

import re
from pathlib import Path

from .files import Config
from .model import Violation

CODE = "N001"
_GLOBS = ("feature/*/presentation/src/commonMain/kotlin/**/*.kt", "composeApp/src/commonMain/kotlin/**/*.kt")
_REGISTERED = re.compile(r"(composable|navigation)<(Screen|Graph)\.(\w+)>")
_NAVIGATED = re.compile(r"\b(?:navigate\w*|navigateTo)\((Screen|Graph)\.(\w+)")


def registered(text: str) -> set[str]:
    return {f"{kind}.{name}" for _, kind, name in _REGISTERED.findall(text)}


def navigated(text: str) -> list[tuple[int, str]]:
    return [(text.count("\n", 0, m.start()) + 1, f"{m.group(1)}.{m.group(2)}") for m in _NAVIGATED.finditer(text)]


def check(config: Config) -> list[Violation]:
    root: Path = config.root
    texts = {str(p.relative_to(root)): p.read_text(encoding="utf-8") for g in _GLOBS for p in sorted(root.glob(g))}
    known = set().union(*(registered(t) for t in texts.values())) if texts else set()
    return [
        Violation(rel, line, CODE, f"{route} is navigated to but never registered in a nav graph")
        for rel, text in texts.items()
        for line, route in navigated(text)
        if route not in known
    ]

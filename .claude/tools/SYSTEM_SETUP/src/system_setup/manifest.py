"""TEMPLATE.json: the contract between the engine and every template kind (workspace, server, admin, sdk, kmp)."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

MANIFEST_NAME = "TEMPLATE.json"
TOKEN_RE = re.compile(r"__[A-Z][A-Z0-9]*(?:_[A-Z0-9<>]+)*__")
KINDS = ("workspace", "server", "admin", "sdk", "kmp")
# Where each kind lands inside the generated repo (relative to its root). A template may override this with "dest".
DEFAULT_DEST = {
    "workspace": ".",
    "server": "__SERVER_DIR__",
    "admin": "__ADMIN_DIR__",
    "sdk": "__SDK_DIR__",
    "kmp": "__APP_DIR__",
}
REQUIRED_KEYS = ("kind", "description", "placeholders")
LIST_KEYS = ("placeholders", "skip", "post_generate", "binary_globs")
DICT_KEYS = ("sentinels", "rename_paths")


class ManifestError(ValueError):
    """The TEMPLATE.json is missing, unreadable or breaks the contract."""


@dataclass
class Manifest:
    kind: str
    description: str
    root: Path
    placeholders: List[str] = field(default_factory=list)
    sentinels: Dict[str, str] = field(default_factory=dict)
    rename_paths: Dict[str, str] = field(default_factory=dict)
    skip: List[str] = field(default_factory=list)
    post_generate: List[str] = field(default_factory=list)
    binary_globs: List[str] = field(default_factory=list)
    dest: str = "."

    @property
    def tokens(self) -> List[str]:
        """Every token the template may use: declared placeholders plus the targets of sentinels and renames."""
        seen: List[str] = []
        for token in [*self.placeholders, *self.sentinels.values(), *self.rename_paths.values()]:
            if token not in seen:
                seen.append(token)
        return seen


def _expect(condition: bool, message: str) -> None:
    if not condition:
        raise ManifestError(message)


def parse_manifest(data: object, root: Path) -> Manifest:
    where = root / MANIFEST_NAME
    _expect(isinstance(data, dict), f"{where}: top level must be an object")
    assert isinstance(data, dict)
    for key in REQUIRED_KEYS:
        _expect(key in data, f"{where}: missing key {key!r}")
    kind = data["kind"]
    _expect(kind in KINDS, f"{where}: kind {kind!r} not one of {', '.join(KINDS)}")
    for key in LIST_KEYS:
        value = data.get(key, [])
        _expect(isinstance(value, list) and all(isinstance(v, str) for v in value),
                f"{where}: {key!r} must be a list of strings")
    for key in DICT_KEYS:
        value = data.get(key, {})
        _expect(isinstance(value, dict) and all(isinstance(k, str) and isinstance(v, str) for k, v in value.items()),
                f"{where}: {key!r} must map literal strings to tokens")
        for literal, token in value.items():
            _expect(bool(literal), f"{where}: {key!r} has an empty literal")
            _expect(TOKEN_RE.fullmatch(token) is not None,
                    f"{where}: {key!r} maps {literal!r} to {token!r}, which is not a __TOKEN__")
    for token in data["placeholders"]:
        _expect(TOKEN_RE.fullmatch(token) is not None, f"{where}: placeholder {token!r} is not a __TOKEN__")
    dest = data.get("dest", DEFAULT_DEST[kind])
    _expect(isinstance(dest, str) and bool(dest) and not dest.startswith("/") and ".." not in Path(dest).parts,
            f"{where}: 'dest' must be a relative path inside the generated repo")
    return Manifest(kind=kind, description=str(data["description"]), root=root, placeholders=list(data["placeholders"]),
                    sentinels=dict(data.get("sentinels", {})), rename_paths=dict(data.get("rename_paths", {})),
                    skip=list(data.get("skip", [])), post_generate=list(data.get("post_generate", [])),
                    binary_globs=list(data.get("binary_globs", [])), dest=dest)


def load_manifest(template_dir: Path) -> Manifest:
    path = template_dir / MANIFEST_NAME
    _expect(path.is_file(), f"template {template_dir.name}: {MANIFEST_NAME} not found in {template_dir}")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ManifestError(f"{path}: invalid JSON ({error})") from error
    manifest = parse_manifest(data, template_dir)
    _expect(manifest.kind == template_dir.name,
            f"{path}: kind {manifest.kind!r} does not match the folder name {template_dir.name!r}")
    return manifest


def tool_root() -> Path:
    """`.claude/tools/SYSTEM_SETUP` (this file is src/system_setup/manifest.py)."""
    return Path(__file__).resolve().parents[2]


def templates_root() -> Path:
    return tool_root() / "templates"


def available_kinds(root: Optional[Path] = None) -> List[str]:
    root = root or templates_root()
    if not root.is_dir():
        return []
    return sorted(p.name for p in root.iterdir() if p.is_dir() and (p / MANIFEST_NAME).is_file())

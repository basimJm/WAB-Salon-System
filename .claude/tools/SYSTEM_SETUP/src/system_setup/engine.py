"""Template engine: copies a template tree, substitutes sentinels and tokens in text files, renames paths.

Order inside a text file: repeated blocks are expanded, then sentinels (longest literal first) become tokens, then every
token becomes its value. Files matching `binary_globs` (and files that are not UTF-8) are copied byte for byte.
"""
from __future__ import annotations

import fnmatch
import re
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath
from typing import Dict, Iterable, List, Mapping, Optional

from manifest import MANIFEST_NAME, TOKEN_RE, Manifest

ALWAYS_SKIP = (".git", "__pycache__", ".DS_Store")
BLOCK_RE = re.compile(r"^[^\S\n]*__EACH_(APP|SDK)__[^\n]*\n(.*?)^[^\S\n]*__END_EACH__[^\n]*\n?", re.M | re.S)
LEFTOVER_RE = re.compile(r"__[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*__")


class EngineError(RuntimeError):
    """Generation cannot continue (e.g. the target is inside the tool)."""


@dataclass
class Result:
    kind: str
    dest: Path
    files: List[Path] = field(default_factory=list)
    binaries: List[Path] = field(default_factory=list)
    overwritten: List[Path] = field(default_factory=list)
    unresolved: Dict[str, List[str]] = field(default_factory=dict)
    post_generate: List[str] = field(default_factory=list)


# ---------- substitution ----------

def expand_blocks(text: str, parts: Mapping[str, Iterable[Mapping[str, str]]]) -> str:
    """Repeats `__EACH_APP__ … __END_EACH__` (or SDK) once per app/SDK with the contextual tokens filled in."""
    def repeat(match: "re.Match[str]") -> str:
        body = match.group(2)
        return "".join(substitute_tokens(body, values) for values in parts.get(match.group(1), []))
    return BLOCK_RE.sub(repeat, text)


def substitute_sentinels(text: str, sentinels: Mapping[str, str]) -> str:
    for literal in sorted(sentinels, key=len, reverse=True):
        text = text.replace(literal, sentinels[literal])
    return text


def substitute_tokens(text: str, values: Mapping[str, str]) -> str:
    for token in sorted(values, key=len, reverse=True):
        if token in text:
            text = text.replace(token, values[token])
    return text


def render_text(text: str, manifest: Manifest, values: Mapping[str, str],
                parts: Optional[Mapping[str, Iterable[Mapping[str, str]]]] = None) -> str:
    text = expand_blocks(text, parts or {})
    text = substitute_sentinels(text, manifest.sentinels)
    return substitute_tokens(text, values)


def render_path(rel: PurePosixPath, manifest: Manifest, values: Mapping[str, str]) -> PurePosixPath:
    """Renames on the whole relative path, so a literal like `com/acme/shop` can span folders (package paths)."""
    text = substitute_sentinels(rel.as_posix(), manifest.rename_paths)
    text = substitute_tokens(text, values)
    rendered = PurePosixPath(text)
    if rendered.is_absolute() or ".." in rendered.parts or not rendered.parts:
        raise EngineError(f"path {rel} renders to {text!r}, which leaves the destination")
    return rendered


def leftovers(text: str) -> List[str]:
    return sorted(set(LEFTOVER_RE.findall(text)))


# ---------- selection ----------

def matches_any(rel: PurePosixPath, globs: Iterable[str]) -> bool:
    text = rel.as_posix()
    for glob in globs:
        if fnmatch.fnmatch(text, glob) or any(fnmatch.fnmatch(part, glob) for part in rel.parts):
            return True
        if glob.endswith("/**") and (text == glob[:-3] or text.startswith(glob[:-2])):
            return True
    return False


def is_skipped(rel: PurePosixPath, manifest: Manifest) -> bool:
    if rel.name == MANIFEST_NAME and len(rel.parts) == 1:
        return True
    if any(part in ALWAYS_SKIP for part in rel.parts):
        return True
    return matches_any(rel, manifest.skip)


def template_files(manifest: Manifest) -> List[PurePosixPath]:
    files = []
    for path in sorted(manifest.root.rglob("*")):
        if not path.is_file() and not path.is_symlink():
            continue
        rel = PurePosixPath(path.relative_to(manifest.root).as_posix())
        if not is_skipped(rel, manifest):
            files.append(rel)
    return files


def resolve_dest(manifest: Manifest, repo_root: Path, values: Mapping[str, str]) -> Path:
    if manifest.dest in (".", ""):
        return repo_root.resolve()
    dest = render_path(PurePosixPath(manifest.dest), manifest, values)
    full = (repo_root / Path(*dest.parts)).resolve()
    if repo_root.resolve() not in (full, *full.parents):
        raise EngineError(f"{manifest.kind}: dest {manifest.dest!r} escapes the repository root")
    return full


# ---------- generation ----------

def instantiate(manifest: Manifest, repo_root: Path, values: Mapping[str, str],
                parts: Optional[Mapping[str, Iterable[Mapping[str, str]]]] = None) -> Result:
    """Writes one template into `repo_root` (under the manifest's dest). Returns what it did."""
    dest = resolve_dest(manifest, repo_root, values)
    result = Result(kind=manifest.kind, dest=dest)
    for rel in template_files(manifest):
        source = manifest.root / Path(*rel.parts)
        out_rel = render_path(rel, manifest, values)
        out = dest / Path(*out_rel.parts)
        out.parent.mkdir(parents=True, exist_ok=True)
        if out.exists():
            result.overwritten.append(out)
        if source.is_symlink():
            if out.is_symlink() or out.exists():
                out.unlink()
            out.symlink_to(source.readlink())
            result.files.append(out)
            continue
        if matches_any(rel, manifest.binary_globs):
            shutil.copyfile(source, out)
            result.binaries.append(out)
        else:
            raw = source.read_bytes()
            try:
                text = raw.decode("utf-8")
            except UnicodeDecodeError:
                out.write_bytes(raw)
                result.binaries.append(out)
            else:
                rendered = render_text(text, manifest, values, parts)
                out.write_text(rendered, encoding="utf-8")
                rest = leftovers(rendered)
                if rest:
                    result.unresolved[str(out.relative_to(repo_root))] = rest
                result.files.append(out)
        shutil.copymode(source, out)
    result.post_generate = [substitute_tokens(substitute_sentinels(cmd, manifest.sentinels), values)
                            for cmd in manifest.post_generate]
    return result


def run_post_generate(result: Result) -> List[str]:
    """Runs the rendered post_generate commands in the part's folder; returns the failures."""
    failures = []
    for command in result.post_generate:
        completed = subprocess.run(command, shell=True, cwd=result.dest, check=False)
        if completed.returncode != 0:
            failures.append(f"{result.kind}: `{command}` exited {completed.returncode}")
    return failures


def check_target(target: Path, tool_root: Path) -> None:
    """The target must not be inside the tool (its templates) and must be empty or absent."""
    resolved = target.resolve()
    tool = tool_root.resolve()
    if resolved == tool or tool in resolved.parents:
        raise EngineError(f"the target {resolved} is inside the tool {tool}; pick a folder outside it")
    if resolved in tool.parents:
        raise EngineError(f"the target {resolved} contains the tool {tool}; pick a folder outside it")
    if resolved.exists() and not resolved.is_dir():
        raise EngineError(f"the target {resolved} is not a folder")
    if resolved.is_dir() and any(resolved.iterdir()):
        raise EngineError(f"the target {resolved} is not empty")

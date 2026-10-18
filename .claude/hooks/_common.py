"""Shared helpers for WAB Claude Code hooks. Standard library only."""
import json
import os
import re
import subprocess
import sys

PROTECTED_BRANCHES = ("main", "master")
SESSION_FILE = os.path.join(".claude", "session.md")
LOOPS_DONE = re.compile(r"Loops:\s*(3\s*/\s*3|1\s*/\s*1\s*\(user decision)", re.IGNORECASE)
REVIEW_DONE = re.compile(r"Review:\s*PASSED", re.IGNORECASE)
DOC_EXTENSIONS = (".md", ".txt", ".html", ".png", ".jpg", ".jpeg", ".svg", ".mp4", ".pdf", ".json", ".yml", ".yaml")
SOURCE_EXTENSIONS = (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".kt", ".kts", ".swift", ".py")
TEST_MARKERS = ("/test/", "/tests/", "__tests__/", "commonTest/", "androidUnitTest/", "iosTest/", "jvmTest/",
                ".test.", ".spec.", "Test.kt", "Tests.kt", "Test.swift", "test_")
IGNORED_PREFIXES = (".claude/", "docs/")


def project_dir():
    return os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()


def read_input():
    try:
        return json.load(sys.stdin)
    except (ValueError, OSError):
        return {}


def git(*args):
    try:
        out = subprocess.run(["git", *args], cwd=project_dir(), capture_output=True, text=True, timeout=20)
        return out.stdout.strip() if out.returncode == 0 else ""
    except (OSError, subprocess.SubprocessError):
        return ""


def current_branch():
    return git("rev-parse", "--abbrev-ref", "HEAD")


def changed_files():
    """Files changed on this branch vs main (committed + uncommitted + untracked)."""
    base_ref = "origin/main" if git("rev-parse", "--verify", "--quiet", "origin/main") else "main"
    base = git("merge-base", "HEAD", base_ref)
    files = set()
    if base:
        files.update(git("diff", "--name-only", base).splitlines())
    files.update(git("diff", "--name-only", "HEAD").splitlines())
    files.update(git("ls-files", "--others", "--exclude-standard").splitlines())
    return sorted(f for f in files if f)


def is_test_file(path):
    return any(marker in path for marker in TEST_MARKERS)


def is_source_file(path):
    if any(path.startswith(p) or f"/{p}" in path for p in IGNORED_PREFIXES):
        return False
    return path.endswith(SOURCE_EXTENSIONS) and not is_test_file(path)


def task_block(branch, session_text=None):
    """Return the session.md task block that references this branch, or ''."""
    if session_text is None:
        path = os.path.join(project_dir(), SESSION_FILE)
        try:
            with open(path, encoding="utf-8") as fh:
                session_text = fh.read()
        except OSError:
            return ""
    blocks = re.split(r"(?m)^###\s+", session_text)
    for block in blocks:
        if re.search(r"Branch:\s*`?" + re.escape(branch) + r"`?\s*$", block, re.MULTILINE):
            return block
    return ""


def task_verified(block):
    return bool(LOOPS_DONE.search(block)) and bool(REVIEW_DONE.search(block))

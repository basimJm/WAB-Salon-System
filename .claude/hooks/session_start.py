#!/usr/bin/env python3
"""SessionStart: show branch, open tasks and the mandatory reading list."""
import os
import re
from _common import current_branch, project_dir, SESSION_FILE, PROTECTED_BRANCHES

def main():
    branch = current_branch() or "unknown"
    lines = [
        "WAB session start — MANDATORY: follow .claude/rules.md, act as all roles in .claude/roles.md, "
        "run the workflow and review hook in .claude/hooks.md, and keep .claude/session.md and .claude/memory.md updated.",
        f"Current branch: {branch}",
    ]
    if branch in PROTECTED_BRANCHES:
        lines.append("You are on a protected branch: create a feature branch from an up-to-date main before changing code.")
    try:
        with open(os.path.join(project_dir(), SESSION_FILE), encoding="utf-8") as fh:
            text = fh.read()
        open_tasks = re.findall(r"(?m)^###\s+(T-\d+[^\n]*)\n(?:(?!^###).*\n)*?- Status:\s*(TODO|IN PROGRESS|BLOCKED)", text)
        if open_tasks:
            lines.append("Open tasks: " + "; ".join(f"{t} [{s}]" for t, s in open_tasks))
    except OSError:
        lines.append("No .claude/session.md found — create it from the template in .claude/hooks.md.")
    print("\n".join(lines))

if __name__ == "__main__":
    main()

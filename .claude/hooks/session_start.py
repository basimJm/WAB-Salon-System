#!/usr/bin/env python3
"""SessionStart: show branch, open tasks (all session files) and how to pick the next backlog task."""
import re
from _common import current_branch, read_sessions, PROTECTED_BRANCHES

def main():
    branch = current_branch() or "unknown"
    lines = [
        "WAB session start — MANDATORY: follow .claude/rules.md, act as all roles in .claude/roles.md, "
        "run the workflow and review hook in .claude/hooks.md, keep the PROJECT .claude/session.md and memory.md updated.",
        f"Current branch: {branch}",
        "Backlog: never read a backlog file whole — run `python3 scripts/tasks.py next <project>` "
        "(projects: server, admin, customer, merchant, payments, otp, notifications, analytics, storage) and `tasks.py set <ID> <STATUS>`.",
    ]
    if branch in PROTECTED_BRANCHES:
        lines.append("You are on a protected branch: create the task branch from the project's master branch (see INTEGRATION.md §1) before changing code.")
    text = read_sessions()
    open_tasks = re.findall(r"(?m)^###\s+(\S+[^\n]*)\n(?:(?!^###).*\n)*?- Status:\s*(TODO|IN PROGRESS|BLOCKED)", text)
    if open_tasks:
        lines.append("Open tasks: " + "; ".join(f"{t[:60]} [{s}]" for t, s in open_tasks))
    print("\n".join(lines))

if __name__ == "__main__":
    main()

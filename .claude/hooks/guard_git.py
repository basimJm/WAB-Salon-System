#!/usr/bin/env python3
"""PreToolUse(Bash): enforce branching and pre-push verification rules."""
import re
import sys
from _common import read_input, current_branch, task_block, task_verified, PROTECTED_BRANCHES

PROTECTED = "|".join(PROTECTED_BRANCHES)

HEREDOC = re.compile(r"<<-?\s*['\"]?(\w+)['\"]?.*?\n\1\b", re.DOTALL)
QUOTED = re.compile(r"'[^']*'|\"(?:\\.|[^\"\\])*\"")


def strip_text(command):
    """Drop heredoc bodies and quoted strings (commit/PR messages) so only real arguments are checked."""
    return QUOTED.sub(" ", HEREDOC.sub(" ", command))


def violation(command, branch, block_lookup=task_block):
    cmd = " ".join(strip_text(command).split())
    if not re.search(r"\bgit\b", cmd):
        return None
    if "--no-verify" in cmd:
        return "Do not bypass git hooks (--no-verify)."
    if re.search(r"\bgit\s+commit\b", cmd) and branch in PROTECTED_BRANCHES:
        return f"Committing on '{branch}' is forbidden. Run: git checkout main && git pull --ff-only && git checkout -b <type>/<name>."
    if re.search(r"\bgit\s+push\b", cmd):
        if re.search(r"(--force\b|-f\b|--force-with-lease)", cmd):
            return "Force push is forbidden."
        if re.search(rf"(\s|:)({PROTECTED})(\s|$)", cmd) or branch in PROTECTED_BRANCHES:
            return "Pushing to main/master is forbidden. Push your feature branch and open a PR."
        block = block_lookup(branch)
        if not block:
            return f"No task block for branch '{branch}' in .claude/session.md. Add it (template in .claude/hooks.md)."
        if not task_verified(block):
            return ("Before pushing: complete 3 verification loops ('Loops: 3/3') and the 4-role review "
                    "('Review: PASSED') in .claude/session.md (see .claude/hooks.md §2).")
    return None

def main():
    data = read_input()
    command = (data.get("tool_input") or {}).get("command", "")
    reason = violation(command, current_branch())
    if reason:
        print(f"BLOCKED by WAB rules: {reason}", file=sys.stderr)
        sys.exit(2)

if __name__ == "__main__":
    main()

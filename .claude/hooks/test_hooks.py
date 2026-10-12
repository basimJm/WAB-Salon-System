#!/usr/bin/env python3
"""Unit tests for WAB hooks. Run: python3 .claude/hooks/test_hooks.py"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import task_block, task_verified, is_source_file, is_test_file  # noqa: E402
from guard_git import violation  # noqa: E402
from check_hardcoded import findings  # noqa: E402
from stop_review import evaluate  # noqa: E402

SESSION = """# Log
### T-001 — done task
- Branch: `feat/done`
- Loops: 3/3
- Review: PASSED (SE ✔)
### T-002 — open task
- Branch: `feat/open`
- Loops: 1/3
- Review: PENDING
"""

def lookup(branch):
    return task_block(branch, SESSION)


class SessionParsing(unittest.TestCase):
    def test_finds_block_for_branch(self):
        self.assertIn("T-001", lookup("feat/done"))
        self.assertEqual(lookup("feat/missing"), "")

    def test_verified_requires_loops_and_review(self):
        self.assertTrue(task_verified(lookup("feat/done")))
        self.assertFalse(task_verified(lookup("feat/open")))


class GuardGit(unittest.TestCase):
    def test_blocks_commit_on_main(self):
        self.assertIsNotNone(violation("git commit -m x", "main", lookup))

    def test_allows_commit_on_feature_branch(self):
        self.assertIsNone(violation("git commit -m x", "feat/open", lookup))

    def test_blocks_push_to_main(self):
        self.assertIsNotNone(violation("git push origin main", "feat/done", lookup))
        self.assertIsNotNone(violation("git push origin HEAD:main", "feat/done", lookup))

    def test_blocks_force_and_no_verify(self):
        self.assertIsNotNone(violation("git push --force origin feat/done", "feat/done", lookup))
        self.assertIsNotNone(violation("git commit --no-verify -m x", "feat/done", lookup))

    def test_push_requires_verified_task(self):
        self.assertIsNotNone(violation("git push -u origin feat/open", "feat/open", lookup))
        self.assertIsNotNone(violation("git push -u origin feat/missing", "feat/missing", lookup))
        self.assertIsNone(violation("git push -u origin feat/done", "feat/done", lookup))

    def test_ignores_flags_inside_messages(self):
        flag = "--no-" + "verify"
        heredoc = "git commit -F - <<'EOF'\nNever use " + flag + " or push to main\nEOF"
        self.assertIsNone(violation(heredoc, "feat/done", lookup))
        self.assertIsNone(violation('git commit -m "mentions ' + flag + ' and main"', "feat/done", lookup))
        self.assertIsNotNone(violation("git commit " + flag + " -m 'x'", "feat/done", lookup))

    def test_ignores_non_git_commands(self):
        self.assertIsNone(violation("npm test", "main", lookup))
        self.assertIsNone(violation("git status", "main", lookup))


class Hardcoded(unittest.TestCase):
    def test_flags_url_and_secret_in_source(self):
        found = findings("WAB-Server/src/app.ts", 'const u = "https://api.example.com"; const apiKey = "abcd1234efgh";')
        self.assertIn("URL", found)
        self.assertIn("secret/API key", found)

    def test_allows_url_in_config_but_not_secret(self):
        self.assertEqual(findings("WAB-Server/src/config/env.ts", 'url: "https://api.example.com"'), [])
        self.assertIn("secret/API key", findings("WAB-Server/src/config/env.ts", 'password = "supersecret1"'))

    def test_ignores_docs_and_tests(self):
        self.assertEqual(findings("WAB-Server/docs/a.md", '"https://x.com"'), [])
        self.assertEqual(findings("WAB-Server/src/a.test.ts", '"https://x.com"'), [])

    def test_clean_source_passes(self):
        self.assertEqual(findings("WAB-Server/src/a.ts", "const limit = config.otp.maxAttempts;"), [])


class StopReview(unittest.TestCase):
    def test_no_source_changes_passes(self):
        self.assertIsNone(evaluate(["README.md", ".claude/session.md"], "feat/x", ""))

    def test_source_without_tests_blocks(self):
        reason = evaluate(["WAB-Server/src/a.ts"], "feat/done", lookup("feat/done"))
        self.assertIn("no unit test", reason)

    def test_unverified_task_blocks(self):
        reason = evaluate(["WAB-Server/src/a.ts", "WAB-Server/src/a.test.ts"], "feat/open", lookup("feat/open"))
        self.assertIn("Loops: 3/3", reason)

    def test_verified_with_tests_passes(self):
        self.assertIsNone(evaluate(["WAB-Server/src/a.ts", "WAB-Server/src/a.test.ts"], "feat/done", lookup("feat/done")))

    def test_file_classification(self):
        self.assertTrue(is_source_file("WAB-Mobile-Customer/feature/auth/Login.kt"))
        self.assertFalse(is_source_file("WAB-Mobile-Customer/feature/auth/LoginTest.kt"))
        self.assertTrue(is_test_file("composeApp/src/commonTest/kotlin/A.kt"))
        self.assertFalse(is_source_file(".claude/hooks/guard_git.py"))


if __name__ == "__main__":
    unittest.main(verbosity=1)

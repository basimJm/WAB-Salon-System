"""MER-003: the merchant app starts with empty policy and detekt baselines and keeps them empty."""
from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


class BaselinesEmptyTest(unittest.TestCase):
    def test_policy_baseline_is_empty(self):
        self.assertEqual({}, json.loads((ROOT / "config/policy-baseline.json").read_text(encoding="utf-8")))

    def test_detekt_baseline_has_no_issue(self):
        text = (ROOT / "config/detekt/baseline.xml").read_text(encoding="utf-8")
        self.assertEqual([], re.findall(r"<ID>(.*?)</ID>", text))


if __name__ == "__main__":
    unittest.main()

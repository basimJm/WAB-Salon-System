"""MER-079: performance configuration that a refactor could silently drop (no Gradle needed to check it)."""
from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUILD_LOGIC = ROOT / "build-logic/convention/src/main/kotlin/com/fab/wab/merchant/buildlogic"


def _modules_with_compose_compiler() -> list[Path]:
    return [
        path for path in ROOT.glob("**/build.gradle.kts")
        if "/build/" not in path.as_posix() and "build-logic" not in path.as_posix()
        and "libs.plugins.composeCompiler" in path.read_text(encoding="utf-8") and path.parent != ROOT
    ]


class ComposeStabilityWiringTest(unittest.TestCase):
    def test_library_plugin_applies_stability_to_every_compose_module(self):
        plugin = (BUILD_LOGIC / "KotlinMultiplatformLibraryPlugin.kt").read_text(encoding="utf-8")
        self.assertIn("withPlugin(COMPOSE_COMPILER_PLUGIN) { configureComposeStability() }", plugin)
        self.assertIn('"org.jetbrains.kotlin.plugin.compose"', plugin)

    def test_modules_adding_the_compose_compiler_by_alias_use_the_library_convention(self):
        modules = _modules_with_compose_compiler()
        self.assertTrue(modules, "expected core modules that add the Compose compiler by alias")
        for path in modules:
            with self.subTest(module=path.parent.relative_to(ROOT).as_posix()):
                self.assertIn("com.fab.wab.merchant.kotlin.multiplatform.library", path.read_text(encoding="utf-8"))

    def test_stability_configuration_is_idempotent(self):
        text = (BUILD_LOGIC / "ComposeStability.kt").read_text(encoding="utf-8")
        self.assertRegex(text, r"if \(extensions\.extraProperties\.has\(CONFIGURED_FLAG\)\) return")


class ShrinkRulesTest(unittest.TestCase):
    def test_no_package_wide_keep_rule_in_the_shared_data_rules(self):
        rules = [
            line.strip() for line in (ROOT / "data-proguard-rules.pro").read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.strip().startswith("#")
        ]
        broad = [rule for rule in rules if re.match(r"-keep\S*\s+class\s+\S*\*\*\s*\{\s*\*;\s*\}", rule)]
        self.assertEqual([], broad)

    def test_app_ships_a_baseline_profile_with_app_rules(self):
        profile = (ROOT / "androidApp/src/main/baseline-prof.txt").read_text(encoding="utf-8").splitlines()
        rules = [line for line in profile if line and not line.startswith("#")]
        self.assertTrue(any("Lcom/fab/wab/merchant/main/MainActivity;" in line for line in rules))
        self.assertTrue(all(re.match(r"^[HSP]*L[^;]+;", line) for line in rules))


if __name__ == "__main__":
    unittest.main()

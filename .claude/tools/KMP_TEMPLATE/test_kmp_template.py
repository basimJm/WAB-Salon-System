"""Unit tests for KMP_TEMPLATE. Run: python3 -m unittest discover -s .claude/tools/KMP_TEMPLATE -p 'test_*.py'"""
from __future__ import annotations

import json
import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import kmp_template  # noqa: E402
from configure import install_firebase, prune_policy_baseline  # noqa: E402
from firebase_files import android_placeholder, ios_placeholder, looks_like, read_android_packages, read_ios_bundle_id  # noqa: E402
from generator import (Options, host_of, merge_into, project_name_from, rename_everything, set_properties,  # noqa: E402
                       strip_features, validate_api_path, validate_package, xcconfig_url)
from genericize import rewrap_sets  # noqa: E402

WAB_TERMS = re.compile(r"(?i)salon|booking|gender|\bcatalog\b|bride|\bstaff\b|merchant|favorites")

CUSTOMER = kmp_template.DEFAULT_SOURCE


class TempDir(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, rel: str, text: str) -> Path:
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path


class NamingTest(unittest.TestCase):
    def test_package_validation(self):
        self.assertIsNone(validate_package("com.acme.shop"))
        self.assertIsNone(validate_package("io.app2.x9"))
        for bad in ("acme", "Com.acme", "com.acme_shop", "com.acme-shop", "com..acme", "com.1acme", "com.acme.object"):
            self.assertIsNotNone(validate_package(bad), bad)

    def test_project_name_from_the_app_name(self):
        self.assertEqual("AcmeShop", project_name_from("Acme shop"))
        self.assertEqual("MyApp2", project_name_from("my-app 2!"))
        self.assertEqual("App123", project_name_from("123"))

    def test_urls(self):
        self.assertEqual("https:/$()/api.acme.io/v1", xcconfig_url("https://api.acme.io/v1"))
        self.assertEqual("api.acme.io", host_of("https://api.acme.io/v1"))


class GenericTest(TempDir):
    def test_sets_are_rewrapped_after_codes_were_dropped(self):
        text = "private val A = setOf(\n    ErrorCode.X, ErrorCode.Y, ErrorCode.Z, ErrorCode.W, ErrorCode.V,\n)\n"
        self.assertEqual("private val A = setOf(\n    ErrorCode.X, ErrorCode.Y, ErrorCode.Z, ErrorCode.W,\n    ErrorCode.V,\n)\n",
                         rewrap_sets(text))

    def test_api_paths(self):
        self.assertIsNone(validate_api_path("/merchant/v1"))
        self.assertIsNone(validate_api_path("/app"))
        for bad in ("merchant/v1", "/Merchant", "/v1/", ""):
            self.assertIsNotNone(validate_api_path(bad), bad)

    def test_merge_keeps_existing_files(self):
        staging = self.root / "staging"
        target = self.root / "target"
        self.write("staging/CLAUDE.md", "generated")
        self.write("staging/core/A.kt", "a")
        self.write("target/CLAUDE.md", "mine")
        kept = merge_into(staging, target)
        self.assertEqual(["CLAUDE.md"], kept)
        self.assertEqual("mine", (target / "CLAUDE.md").read_text(encoding="utf-8"))
        self.assertEqual("a", (target / "core/A.kt").read_text(encoding="utf-8"))
        self.assertFalse(staging.exists())


class PropertiesTest(unittest.TestCase):
    def test_replaces_values_and_keeps_comments_and_order(self):
        text = "# comment\nA = 1\nB=2\n"
        self.assertEqual("# comment\nA = x\nB=y\n", set_properties(text, {"A": "x", "B": "y"}))

    def test_empty_value_does_not_swallow_the_next_line(self):
        text = "SUFFIX = .dev\nPRODUCT_BUNDLE_IDENTIFIER = com.x$(SUFFIX)\n"
        self.assertEqual("SUFFIX = \nPRODUCT_BUNDLE_IDENTIFIER = com.x$(SUFFIX)\n", set_properties(text, {"SUFFIX": ""}))

    def test_missing_key_fails(self):
        with self.assertRaises(ValueError):
            set_properties("A=1\n", {"B": "2"})


class StripAndRenameTest(TempDir):
    def test_only_the_sample_feature_stays(self):
        self.write("settings.gradle.kts", 'include(\n    ":baselineprofile",\n    ":core:ui",\n    ":feature:sample:di",\n    ":feature:home:di",\n    ":feature:salon-x:data",\n)\n')
        self.write("build-logic/convention/src/main/kotlin/x/ComposeAppPlugin.kt",
                   'val FEATURE_MODULES = listOf(\n    ":feature:sample:di",\n    ":feature:home:di",\n)\n')
        strip_features(self.root)
        settings = (self.root / "settings.gradle.kts").read_text(encoding="utf-8")
        self.assertIn(":feature:sample:di", settings)
        self.assertIn(":core:ui", settings)
        self.assertNotIn(":feature:home", settings)
        self.assertNotIn(":feature:salon-x", settings)
        self.assertNotIn(":baselineprofile", settings)
        plugin = (self.root / "build-logic/convention/src/main/kotlin/x/ComposeAppPlugin.kt").read_text(encoding="utf-8")
        self.assertIn(":feature:sample:di", plugin)
        self.assertNotIn(":feature:home", plugin)

    def test_package_names_and_folders_are_renamed(self):
        self.write("core/ui/src/commonMain/kotlin/com/fab/wab/customer/core/ui/A.kt", "package com.fab.wab.customer.core.ui\n")
        self.write("gradle/libs.versions.toml", 'com-fab-wab-customer-core-library = { id = "com.fab.wab.customer.core.library" }\n')
        self.write("iosApp/Configuration/Config.xcconfig", "PRODUCT_NAME=WABCustomer\nWAB_ENTITLEMENTS = x\n")
        self.write("logo.png", "\x89PNG com.fab.wab.customer")
        rename_everything(self.root, Options(target=self.root, app_name="Acme", package="com.acme.shop", project_name="Acme"))
        moved = self.root / "core/ui/src/commonMain/kotlin/com/acme/shop/core/ui/A.kt"
        self.assertEqual("package com.acme.shop.core.ui\n", moved.read_text(encoding="utf-8"))
        self.assertFalse((self.root / "core/ui/src/commonMain/kotlin/com/fab").exists())
        toml = (self.root / "gradle/libs.versions.toml").read_text(encoding="utf-8")
        self.assertEqual('com-acme-shop-core-library = { id = "com.acme.shop.core.library" }\n', toml)
        self.assertEqual("PRODUCT_NAME=Acme\nAPP_ENTITLEMENTS = x\n",
                         (self.root / "iosApp/Configuration/Config.xcconfig").read_text(encoding="utf-8"))
        self.assertIn("com.fab.wab.customer", (self.root / "logo.png").read_text(encoding="utf-8"))  # binary untouched


class FirebaseTest(TempDir):
    def test_placeholders_carry_the_expected_ids(self):
        android = self.write("g.json", android_placeholder("com.acme.shop.dev", "dev"))
        ios = self.write("G.plist", ios_placeholder("com.acme.shop", "prod"))
        self.assertEqual(["com.acme.shop.dev"], read_android_packages(android))
        self.assertEqual("com.acme.shop", read_ios_bundle_id(ios))
        self.assertTrue(looks_like(android, "android_dev"))
        self.assertTrue(looks_like(ios, "ios_prod"))
        self.assertFalse(looks_like(ios, "android_dev"))
        self.assertNotEqual(39, len(json.loads(android.read_text(encoding="utf-8"))["client"][0]["api_key"][0]["current_key"]))

    def test_provided_files_are_copied_and_checked(self):
        good = self.write("in/dev.json", android_placeholder("com.acme.shop.dev", "dev"))
        wrong = self.write("in/prod.plist", ios_placeholder("com.other", "prod"))
        opts = Options(target=self.root / "out", app_name="Acme", package="com.acme.shop", project_name="Acme",
                       firebase={"android_dev": good, "ios_prod": wrong})
        notes = install_firebase(opts.target, opts)
        self.assertTrue((opts.target / "androidApp/src/dev/google-services.json").exists())
        self.assertTrue(any(n.startswith("WARNING iosApp/Firebase/prod") for n in notes))
        self.assertTrue(any("PLACEHOLDER for com.acme.shop" in n and "android" in n for n in notes))
        self.assertEqual(["com.acme.shop"], read_android_packages(opts.target / "androidApp/src/prod/google-services.json"))


class BaselineTest(TempDir):
    def test_entries_of_removed_files_are_dropped(self):
        self.write("kept.kt", "")
        self.write("config/policy-baseline.json", json.dumps({"kept.kt": {"H006": 1}, "gone.kt": {"H003": 2}}))
        prune_policy_baseline(self.root)
        self.assertEqual({"kept.kt": {"H006": 1}}, json.loads((self.root / "config/policy-baseline.json").read_text(encoding="utf-8")))


class PromptTest(unittest.TestCase):
    def test_ask_repeats_until_valid_and_uses_the_default(self):
        answers = iter(["Bad.Package", "", "com.ok.app"])
        result = kmp_template.ask("Package", "", validate_package, reader=lambda _: next(answers))
        self.assertEqual("com.ok.app", result)
        self.assertEqual("x", kmp_template.ask("Q", "x", reader=lambda _: ""))

    def test_flags_fill_every_answer_without_prompting(self):
        with tempfile.TemporaryDirectory() as tmp:
            args = kmp_template.parse_args(["--yes", "--app-name", "Acme Shop", "--package", "com.acme.shop",
                                            "--target", str(Path(tmp) / "Acme")])
            opts = kmp_template.collect(args)
        self.assertEqual("AcmeShop", opts.project_name)
        self.assertEqual(".dev", opts.dev_suffix)
        self.assertEqual("Acme Shop", opts.app_name_ar)
        self.assertEqual({"android_dev": None, "android_prod": None, "ios_dev": None, "ios_prod": None}, opts.firebase)
        self.assertEqual(("/api/v1", "/app", "mock"), (opts.api_prefix, opts.realtime_namespace, opts.dev_data_source))


@unittest.skipUnless((CUSTOMER / "settings.gradle.kts").exists(), "customer app not next to the tool")
class EndToEndTest(TempDir):
    def test_refuses_a_target_inside_the_template(self):
        code = kmp_template.main(["--yes", "--app-name", "Acme", "--package", "com.acme.shop",
                                  "--target", str(CUSTOMER / "Nested")])
        self.assertEqual(1, code)
        self.assertFalse((CUSTOMER / "Nested").exists())

    def test_generates_a_renamed_project_with_only_the_sample_feature(self):
        target = self.root / "Acme"
        opts = Options(target=target, app_name="Acme Shop", package="com.acme.shop", project_name="AcmeShop",
                       api_prefix="/shop/v1", realtime_namespace="/shop")
        kmp_template.generate(opts, CUSTOMER, git=False)
        business = [str(p.relative_to(target)) for p in target.rglob("*")
                    if p.is_file() and p.suffix in (".kt", ".kts", ".xml", ".plist", ".xcconfig", ".properties", ".strings", ".swift")
                    and WAB_TERMS.search(p.read_text(encoding="utf-8"))]
        self.assertEqual([], business)
        auth = next(target.rglob("AuthEndpoints.kt")).read_text(encoding="utf-8")
        self.assertIn('"/shop/v1/auth/refresh"', auth)
        self.assertIn('"/shop"', next(target.rglob("RealtimeConfig.kt")).read_text(encoding="utf-8"))
        self.assertIn("DEV_DATA_SOURCE=mock", (target / "gradle.properties").read_text(encoding="utf-8"))
        for doc in (".claude/rules.md", ".claude/roles.md", ".claude/session.md", ".claude/memory.md"):
            self.assertTrue((target / doc).exists(), doc)
        self.assertNotIn("__", (target / ".claude/memory.md").read_text(encoding="utf-8"))
        self.assertFalse(list((target / "core/data").rglob("contract")))
        self.assertEqual(["sample"], sorted(p.name for p in (target / "feature").iterdir()))
        self.assertEqual([], kmp_template.leftovers(target))
        self.assertFalse(list(target.rglob("fab")))
        settings = (target / "settings.gradle.kts").read_text(encoding="utf-8")
        self.assertIn('rootProject.name = "AcmeShop"', settings)
        self.assertNotIn(":feature:home", settings)
        self.assertIn("APP_DISPLAY_NAME = Acme Shop Dev", (target / "iosApp/Configuration/Dev.xcconfig").read_text(encoding="utf-8"))
        self.assertIn("PRODUCT_BUNDLE_IDENTIFIER = com.acme.shop$(BUNDLE_ID_SUFFIX)",
                      (target / "iosApp/Configuration/Prod.xcconfig").read_text(encoding="utf-8"))
        self.assertEqual(["com.acme.shop.dev"], read_android_packages(target / "androidApp/src/dev/google-services.json"))
        self.assertTrue((target / ".github/workflows/ci.yml").exists())
        self.assertIn("## 11. Error Codes", (target / "BUSINESS_DOMAIN.md").read_text(encoding="utf-8"))
        app = target / "composeApp/src/commonMain/kotlin/com/acme/shop/app/ui/App.kt"
        self.assertNotIn("feature.home", app.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()

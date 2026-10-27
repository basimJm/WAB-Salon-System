import unittest
from support import TempProject
from policy import variants

PLUGIN = "build-logic/convention/src/main/kotlin/com/fab/wab/merchant/buildlogic/AndroidAppPlugin.kt"
PBXPROJ = "iosApp/iosApp.xcodeproj/project.pbxproj"
SCHEMES = "iosApp/iosApp.xcodeproj/xcshareddata/xcschemes"
WORKFLOW = ".github/workflows/merchant-ci.yml"
SCHEME_XML = (
    '<Scheme><BuildAction/><TestAction buildConfiguration="Debug-{e}"/><LaunchAction buildConfiguration="Debug-{e}"/>'
    '<ProfileAction buildConfiguration="Release-{e}"/><AnalyzeAction buildConfiguration="Debug-{e}"/>'
    '<ArchiveAction buildConfiguration="Release-{e}"/></Scheme>'
)
XCCONFIG = "APP_ENV = {e}\nAPI_BASE_URL = https:/$()/x\nAPP_DISPLAY_NAME = WAB\nPRODUCT_BUNDLE_IDENTIFIER = com.x\nDATA_SOURCE = mock\n"


class VariantsTest(TempProject):
    def setUp(self):
        super().setUp()
        self.build_valid()

    def build_valid(self):
        self.write(PLUGIN, 'productFlavors { create("dev") {} create("prod") {} }\nbuildTypes { getByName("debug") {} getByName("release") {} }')
        self.write("gradle.properties", "DEV_API_BASE_URL=https://dev.example\nPROD_API_BASE_URL=https://example\nDEV_DATA_SOURCE=mock\nPROD_DATA_SOURCE=remote\n")
        names = "\n".join(f"\t\t\tname = {n};" for n in ["Debug-Dev", "Release-Dev", "Debug-Prod", "Release-Prod"])
        self.write(PBXPROJ, names)
        for scheme, env in (("iosApp-Dev", "Dev"), ("iosApp-Prod", "Prod")):
            self.write(f"{SCHEMES}/{scheme}.xcscheme", SCHEME_XML.format(e=env))
            self.write(f"iosApp/Configuration/{env}.xcconfig", XCCONFIG.format(e=env))
        wf = self.root.parent / WORKFLOW
        wf.parent.mkdir(parents=True)
        wf.write_text("dev prod debug release iosApp-Dev iosApp-Prod Debug-Dev Release-Dev Debug-Prod Release-Prod", encoding="utf-8")

    def messages(self):
        return [v.message for v in variants.check(self.config)]

    def test_valid_project_passes(self):
        self.assertEqual(self.messages(), [])

    def test_missing_android_flavor(self):
        self.write(PLUGIN, 'create("dev")\ngetByName("debug") getByName("release")')
        self.assertIn("product flavor 'prod' is not declared", self.messages())

    def test_missing_build_type_and_property(self):
        self.write(PLUGIN, 'create("dev") create("prod") getByName("debug")')
        self.write("gradle.properties", "DEV_API_BASE_URL=\n")
        messages = self.messages()
        self.assertIn("build type 'release' is not configured", messages)
        self.assertIn("missing or empty property DEV_API_BASE_URL", messages)
        self.assertIn("missing or empty property PROD_API_BASE_URL", messages)

    def test_ios_configuration_missing_or_unscoped(self):
        self.write(PBXPROJ, "name = Debug-Dev;\nname = Release-Dev;\nname = Debug-Prod;\nname = Debug;")
        messages = self.messages()
        self.assertIn("build configuration 'Release-Prod' is missing", messages)
        self.assertTrue(any("unscoped configuration 'Debug'" in m for m in messages))

    def test_scheme_wrong_configuration_or_missing(self):
        self.write(f"{SCHEMES}/iosApp-Dev.xcscheme", SCHEME_XML.format(e="Prod"))
        (self.root / SCHEMES / "iosApp-Prod.xcscheme").unlink()
        messages = self.messages()
        self.assertTrue(any("LaunchAction must use 'Debug-Dev'" in m for m in messages))
        self.assertIn("shared scheme 'iosApp-Prod' is missing", messages)

    def test_xcconfig_keys_required(self):
        self.write("iosApp/Configuration/Prod.xcconfig", "APP_ENV = Prod\n")
        self.assertTrue(any("missing or empty key API_BASE_URL" in m for m in self.messages()))

    def test_workflow_must_build_every_variant(self):
        (self.root.parent / WORKFLOW).write_text("dev debug", encoding="utf-8")
        messages = self.messages()
        self.assertIn("workflow does not build 'prod'", messages)
        self.assertIn("workflow does not build 'iosApp-Prod'", messages)


def _config_block(name, settings):
    body = "".join(f"\t\t\t\t{key} = {value};\n" for key, value in settings.items())
    return (f"\t\tAB /* {name} */ = {{\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbaseConfigurationReferenceAnchor = X;\n"
            f"\t\t\tbuildSettings = {{\n{body}\t\t\t}};\n\t\t\tname = {name};\n\t\t}};\n")


RELEASE_OK = {"KOTLIN_FRAMEWORK_BUILD_TYPE": "release", "SWIFT_OPTIMIZATION_LEVEL": '"-O"',
              "SWIFT_COMPILATION_MODE": "wholemodule", "DEAD_CODE_STRIPPING": "YES", "ONLY_ACTIVE_ARCH": "NO"}
DEBUG_OK = {"KOTLIN_FRAMEWORK_BUILD_TYPE": "debug", "ONLY_ACTIVE_ARCH": "YES", "DEAD_CODE_STRIPPING": "YES"}


class IosBuildSettingsTest(unittest.TestCase):
    """MER-078: release configurations stay optimized, debug ones stay incremental."""

    def check(self, *blocks):
        return [v.message for v in variants._check_ios_build_settings("".join(blocks))]

    def test_optimized_release_and_debug_pass(self):
        self.assertEqual(self.check(_config_block("Debug-Dev", DEBUG_OK), _config_block("Release-Prod", RELEASE_OK)), [])

    def test_release_without_optimizations_is_reported(self):
        unoptimized = {"KOTLIN_FRAMEWORK_BUILD_TYPE": "debug", "SWIFT_COMPILATION_MODE": "wholemodule", "ONLY_ACTIVE_ARCH": "YES"}
        messages = self.check(_config_block("Release-Dev", unoptimized))
        self.assertIn("Release-Dev: KOTLIN_FRAMEWORK_BUILD_TYPE must be release, found debug", messages)
        self.assertIn('Release-Dev: SWIFT_OPTIMIZATION_LEVEL must be "-O", found None', messages)
        self.assertIn("Release-Dev: DEAD_CODE_STRIPPING must be YES, found None", messages)
        self.assertIn("Release-Dev: ONLY_ACTIVE_ARCH must be NO, found YES", messages)

    def test_debug_with_release_framework_is_reported(self):
        messages = self.check(_config_block("Debug-Prod", {**DEBUG_OK, "KOTLIN_FRAMEWORK_BUILD_TYPE": "release"}))
        self.assertEqual(messages, ["Debug-Prod: KOTLIN_FRAMEWORK_BUILD_TYPE must be debug, found release"])

    def test_target_level_blocks_are_ignored(self):
        target = "\t\tAB /* Release-Dev */ = {\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = {\n\t\t\t\tARCHS = arm64;\n\t\t\t};\n\t\t};\n"
        self.assertEqual(self.check(target), [])

    def test_real_project_passes(self):
        from pathlib import Path
        project = Path(__file__).resolve().parents[3] / PBXPROJ
        self.assertEqual(self.check(project.read_text(encoding="utf-8")), [])


if __name__ == "__main__":
    unittest.main()

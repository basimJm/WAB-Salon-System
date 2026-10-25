import unittest

from support import TempProject

from policy import analytics  # noqa: E402  (support puts scripts/ci on the path)

SCREEN_DIR = "feature/x/presentation/src/commonMain/kotlin/a/screen/"
EVENTS_DIR = "feature/x/presentation/src/commonMain/kotlin/a/analytics/"


class AnalyticsTest(TempProject):
    def test_screen_without_track_screen_is_reported(self):
        self.write(SCREEN_DIR + "AScreen.kt", "@Composable\nfun AScreen(state: S) {\n    TrackScreen(X)\n}\n")
        self.write(SCREEN_DIR + "BScreen.kt", "@Composable\nfun BScreen(state: S) {\n}\n@Composable\nprivate fun Row() {}\n")
        self.config.data["analytics"] = {"requiredEvents": []}
        found = analytics.check(self.config)
        self.assertEqual(self.rules(found), [analytics.SCREEN])
        self.assertIn("BScreen", found[0].message)

    def test_event_names_and_required_events(self):
        self.write(EVENTS_DIR + "XAnalytics.kt", 'const val ACTION_OK = "request_accept"\nconst val ACTION_BAD = "Bad-Name"\n')
        self.config.data["analytics"] = {"requiredEvents": ["request_accept", "push_open"]}
        found = analytics.check(self.config)
        self.assertEqual(self.rules(found), [analytics.NAME, analytics.MISSING])
        self.assertIn("push_open", [v for v in found if v.rule == analytics.MISSING][0].message)

    def test_parsers(self):
        self.assertEqual(analytics.screens_without_tracking("@Composable\nfun CScreen() {}"), ["CScreen"])
        self.assertEqual(analytics.event_names('const val ACTION_A = "a_b"'), ["a_b"])


if __name__ == "__main__":
    unittest.main()

import unittest

from support import TempProject

from policy import navigation  # noqa: E402  (support puts scripts/ci on the path)

NAV = "feature/x/presentation/src/commonMain/kotlin/a/navigation/"


class NavigationTest(TempProject):
    def test_unregistered_route_is_reported(self):
        self.write(NAV + "XNavigation.kt", "navigation<Graph.X>(startDestination = Screen.A) {\n    composable<Screen.A> { }\n}\n"
                   "fun go() {\n    navigateTo(Screen.A)\n    navigateAndClearBackstack(Graph.Home)\n}\n")
        found = navigation.check(self.config)
        self.assertEqual(self.rules(found), [navigation.CODE])
        self.assertEqual(found[0].line, 6)
        self.assertIn("Graph.Home", found[0].message)

    def test_parsers(self):
        self.assertEqual(navigation.registered("composable<Screen.B> {}\nnavigation<Graph.G>()"), {"Screen.B", "Graph.G"})
        self.assertEqual(navigation.navigated("x\nnavController.navigate(Screen.C(1))"), [(2, "Screen.C")])


if __name__ == "__main__":
    unittest.main()

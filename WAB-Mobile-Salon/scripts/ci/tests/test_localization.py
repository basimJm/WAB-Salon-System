import unittest
from support import TempProject
from policy import localization

EN = '<resources>\n{}\n</resources>'
PATH_EN = "core/m/src/commonMain/composeResources/values/strings.xml"
PATH_AR = "core/m/src/commonMain/composeResources/values-ar/strings.xml"


def res(*pairs):
    return EN.format("\n".join(f'<string name="{k}">{v}</string>' for k, v in pairs))


class LocalizationTest(TempProject):
    def run_check(self, en, ar):
        self.write(PATH_EN, en)
        if ar is not None:
            self.write(PATH_AR, ar)
        return [v.message for v in localization.check(self.config)]

    def test_matching_files_pass(self):
        self.assertEqual(self.run_check(res(("a", "Retry"), ("b", "Hi %1$s")), res(("a", "إعادة المحاولة"), ("b", "مرحبا %1$s"))), [])

    def test_missing_arabic_file(self):
        self.assertIn("missing values-ar/strings.xml (ar translation)", self.run_check(res(("a", "Retry")), None))

    def test_missing_and_extra_keys(self):
        messages = self.run_check(res(("a", "A"), ("b", "B")), res(("a", "أ"), ("c", "ج")))
        self.assertTrue(any("missing ar translation for string:b" in m for m in messages))
        self.assertTrue(any("string:c has no default" in m for m in messages))

    def test_placeholder_mismatch(self):
        messages = self.run_check(res(("a", "Hi %1$s")), res(("a", "مرحبا")))
        self.assertTrue(any("placeholders of string:a differ" in m for m in messages))

    def test_empty_translation(self):
        self.assertTrue(any("is empty" in m for m in self.run_check(res(("a", "Hi")), res(("a", " ")))))

    def test_untranslated_copy_is_flagged_but_short_brand_names_are_not(self):
        self.assertTrue(any("untranslated copy" in m for m in self.run_check(res(("a", "Retry now")), res(("a", "Retry now")))))
        self.assertEqual(self.run_check(res(("a", "WAB"), ("b", "OK")), res(("a", "WAB"), ("b", "OK"))), [])

    def test_translatable_false_is_skipped(self):
        en = '<resources><string name="x" translatable="false">Brand Name</string></resources>'
        self.assertEqual(self.run_check(en, "<resources></resources>"), [])

    def test_plurals_and_arrays_are_compared(self):
        en = '<resources><plurals name="p"><item quantity="one">%d day</item><item quantity="other">%d days</item></plurals></resources>'
        ar = '<resources><plurals name="p"><item quantity="one">يوم</item></plurals></resources>'
        self.assertTrue(any("placeholders of plurals:p" in m for m in self.run_check(en, ar)))

    def test_arabic_plural_quantities_may_spell_out_the_number(self):
        en = ('<resources><plurals name="p"><item quantity="one">%1$d minute ago</item>'
              '<item quantity="other">%1$d minutes ago</item></plurals></resources>')
        ar = ('<resources><plurals name="p"><item quantity="one">منذ دقيقة</item><item quantity="two">منذ دقيقتين</item>'
              '<item quantity="few">منذ %1$d دقائق</item><item quantity="other">منذ %1$d دقيقة</item></plurals></resources>')
        self.assertEqual(self.run_check(en, ar), [])


if __name__ == "__main__":
    unittest.main()

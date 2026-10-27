package com.fab.wab.customer.baselineprofile

import androidx.benchmark.macro.MacrobenchmarkScope
import androidx.test.uiautomator.By
import androidx.test.uiautomator.BySelector
import androidx.test.uiautomator.Direction
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import java.util.regex.Pattern

/**
 * The main customer journey, written against what a user sees (texts in Arabic, the default, or English) so it works on
 * any screen size. Every step is optional: a missing element (no salons, signed out, another language) skips that
 * step instead of failing the collection, because the profile only needs the code paths that were reached.
 */
internal fun MacrobenchmarkScope.mainJourney() {
    pressHome()
    startActivityAndWait()
    device.waitForIdle()
    passFirstLaunch()
    scrollFeed()
    openAndReturn(JourneyTexts.SEARCH) { scrollFeed() }
    openFirstRecommendedSalon()
    openTab(JourneyTexts.BOOKINGS_TAB)
    scrollFeed()
    openTab(JourneyTexts.HOME_TAB)
}

/** Onboarding (Skip) and the guest profile (name + gender + Continue) on a fresh install. */
private fun MacrobenchmarkScope.passFirstLaunch() {
    device.clickIfShown(By.text(JourneyTexts.SKIP)) ?: return
    device.findObject(By.clazz(EDIT_TEXT_CLASS))?.text = JourneyTexts.GUEST_NAME
    device.pressBack()
    device.clickIfShown(By.text(JourneyTexts.WOMAN))
    device.clickIfShown(By.text(JourneyTexts.CONTINUE))
    device.wait(Until.hasObject(By.text(JourneyTexts.HOME_TAB)), JourneyTimeouts.SCREEN_MS)
}

/** Flings the first scrollable container down and back up (lazy lists, the Home feed, salon details). */
private fun MacrobenchmarkScope.scrollFeed() {
    val scrollable = device.wait(Until.findObject(By.scrollable(true)), JourneyTimeouts.SCREEN_MS) ?: return
    scrollable.setGestureMargin(device.displayWidth / GESTURE_MARGIN_DIVISOR)
    repeat(FLINGS) { scrollable.fling(Direction.DOWN) }
    device.waitForIdle()
    repeat(FLINGS) { scrollable.fling(Direction.UP) }
    device.waitForIdle()
}

private fun MacrobenchmarkScope.openAndReturn(target: Pattern, onScreen: MacrobenchmarkScope.() -> Unit) {
    device.clickIfShown(By.text(target)) ?: return
    device.waitForIdle()
    onScreen()
    device.pressBack()
    device.waitForIdle()
}

/** Salon details: taps the first salon card (its review count "(28)" sits inside the card in both layouts). */
private fun MacrobenchmarkScope.openFirstRecommendedSalon() {
    device.clickIfShown(By.text(JourneyTexts.REVIEW_COUNT)) ?: return
    device.waitForIdle()
    scrollFeed()
    device.pressBack()
    device.waitForIdle()
}

private fun MacrobenchmarkScope.openTab(label: Pattern) {
    device.clickIfShown(By.text(label))
    device.waitForIdle()
}

private fun UiDevice.clickIfShown(selector: BySelector): Unit? =
    wait(Until.findObject(selector), JourneyTimeouts.ELEMENT_MS)?.click()

private const val EDIT_TEXT_CLASS = "android.widget.EditText"
private const val FLINGS = 2
private const val GESTURE_MARGIN_DIVISOR = 5

/** Visible texts the journey looks for, in both app languages (Arabic is the default). Test-only, never shipped. */
private object JourneyTexts {
    val SKIP: Pattern = Pattern.compile("تخطي|Skip")
    val WOMAN: Pattern = Pattern.compile("امرأة|Woman")
    val CONTINUE: Pattern = Pattern.compile("متابعة|Continue")
    val SEARCH: Pattern = Pattern.compile("ابحث عن اسم الصالون.*|Search.*salon.*")
    val REVIEW_COUNT: Pattern = Pattern.compile("\\(\\d+\\)")
    val HOME_TAB: Pattern = Pattern.compile("الرئيسية|Home")
    val BOOKINGS_TAB: Pattern = Pattern.compile("الحجوزات|Bookings")
    const val GUEST_NAME = "Profile"
}

private object JourneyTimeouts {
    const val SCREEN_MS = 5_000L
    const val ELEMENT_MS = 2_000L
}

package com.fab.wab.customer.baselineprofile

import androidx.benchmark.macro.MacrobenchmarkScope
import androidx.test.uiautomator.By
import androidx.test.uiautomator.BySelector
import androidx.test.uiautomator.StaleObjectException
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import java.util.regex.Pattern

/**
 * The main customer journey, written against what a user sees (texts in Arabic, the default, or English) so it works on
 * any screen size. Every step is optional: a missing element (no salons, signed out, another language) skips that
 * step instead of failing the collection, because the profile only needs the code paths that were reached.
 */
internal fun MacrobenchmarkScope.mainJourney() {
    launchToHome()
    scrollFeed()
    openAndReturn(JourneyTexts.SEARCH) { scrollFeed() }
    openFirstRecommendedSalon()
    openTab(JourneyTexts.BOOKINGS_TAB)
    scrollFeed()
    openTab(JourneyTexts.HOME_TAB)
}

/** Cold start up to Home (first launch screens included on a fresh install). */
internal fun MacrobenchmarkScope.launchToHome() {
    pressHome()
    startActivityAndWait()
    device.waitForIdle()
    passFirstLaunch()
}

/**
 * Onboarding (Skip) and the guest profile (name + gender + Continue) on a fresh install. The name is set through
 * accessibility (no keyboard); Back is pressed only when Continue did not lead Home (a keyboard covered it), because
 * Back without a keyboard would leave the app.
 */
private fun MacrobenchmarkScope.passFirstLaunch() {
    device.clickIfShown(By.text(JourneyTexts.SKIP)) ?: return
    device.wait(Until.findObject(By.clazz(EDIT_TEXT_CLASS)), JourneyTimeouts.SCREEN_MS)?.text = JourneyTexts.GUEST_NAME
    device.clickIfShown(By.text(JourneyTexts.WOMAN))
    device.clickIfShown(By.text(JourneyTexts.CONTINUE))
    if (!device.wait(Until.hasObject(By.text(JourneyTexts.HOME_TAB)), JourneyTimeouts.SCREEN_MS)) {
        device.pressBack()
        device.clickIfShown(By.text(JourneyTexts.CONTINUE))
        device.wait(Until.hasObject(By.text(JourneyTexts.HOME_TAB)), JourneyTimeouts.SCREEN_MS)
    }
}

/**
 * Swipes the screen content up and back down (Home feed, lists, salon details). Device-level swipes instead of
 * `UiObject2.fling`: the feed recomposes while it loads, which makes a found node stale.
 */
private fun MacrobenchmarkScope.scrollFeed() {
    device.wait(Until.hasObject(By.scrollable(true)), JourneyTimeouts.SCREEN_MS)
    val x = device.displayWidth / 2
    val top = device.displayHeight / SWIPE_EDGE_DIVISOR
    val bottom = device.displayHeight - top
    repeat(FLINGS) { device.swipe(x, bottom, x, top, SWIPE_STEPS) }
    device.waitForIdle()
    repeat(FLINGS) { device.swipe(x, top, x, bottom, SWIPE_STEPS) }
    device.waitForIdle()
}

private fun MacrobenchmarkScope.openAndReturn(target: Pattern, onScreen: MacrobenchmarkScope.() -> Unit) {
    device.clickIfShown(By.text(target)) ?: return
    device.waitForIdle()
    onScreen()
    backToTabs()
}

/** Salon details: taps the first salon card (its review count "(28)" sits inside the card in both layouts). */
private fun MacrobenchmarkScope.openFirstRecommendedSalon() {
    device.clickIfShown(By.text(JourneyTexts.REVIEW_COUNT)) ?: return
    device.waitForIdle()
    scrollFeed()
    backToTabs()
}

/** Back until the tab bar shows again (a keyboard or a nested screen may take one Back each). */
private fun MacrobenchmarkScope.backToTabs() {
    repeat(MAX_BACKS) {
        if (device.hasObject(By.text(JourneyTexts.HOME_TAB))) return
        device.pressBack()
        device.waitForIdle()
    }
}

private fun MacrobenchmarkScope.openTab(label: Pattern) {
    device.clickIfShown(By.text(label))
    device.waitForIdle()
}

/** Taps the element when it shows up; a node that recomposed away between find and tap counts as not shown. */
private fun UiDevice.clickIfShown(selector: BySelector): Unit? =
    try {
        wait(Until.findObject(selector), JourneyTimeouts.ELEMENT_MS)?.click()
    } catch (ignored: StaleObjectException) {
        null
    }

private const val EDIT_TEXT_CLASS = "android.widget.EditText"
private const val FLINGS = 2
private const val SWIPE_EDGE_DIVISOR = 4
private const val SWIPE_STEPS = 12
private const val MAX_BACKS = 3

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

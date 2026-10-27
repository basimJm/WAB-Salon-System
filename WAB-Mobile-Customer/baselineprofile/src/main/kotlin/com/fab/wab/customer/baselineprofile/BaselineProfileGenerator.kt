package com.fab.wab.customer.baselineprofile

import androidx.benchmark.macro.junit4.BaselineProfileRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * CUS-097: collects the Baseline Profile and the Startup Profile of the customer app.
 *
 * Run on a connected API 33+ emulator or device with the app pointed at a backend that has data:
 * `ANDROID_SERIAL=<device> ./gradlew :androidApp:generateDevReleaseBaselineProfile`.
 * The profile is merged into `androidApp/src/main/generated/baselineProfiles` (both flavors run the same code).
 * The journey ([mainJourney]) covers cold start, the first-launch screens, Home with its scrolling feed, the salon
 * list, salon details and the bookings tab; everything inside [BaselineProfileRule.collect] with
 * `includeInStartupProfile = true` also feeds the Startup Profile (DEX layout of the startup classes).
 */
@RunWith(AndroidJUnit4::class)
class BaselineProfileGenerator {

    @get:Rule
    val rule = BaselineProfileRule()

    @Test
    fun generate() {
        // The baselineprofile Gradle plugin passes the target application id (dev or prod flavor).
        val packageName = InstrumentationRegistry.getArguments().getString(TARGET_APP_ID_ARGUMENT)
            ?: error("$TARGET_APP_ID_ARGUMENT instrumentation argument is missing")
        rule.collect(packageName = packageName, includeInStartupProfile = true) {
            mainJourney()
        }
    }

    private companion object {
        const val TARGET_APP_ID_ARGUMENT = "targetAppId"
    }
}

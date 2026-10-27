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
 * `ANDROID_SERIAL=<device> ./gradlew :androidApp:generateBaselineProfile` (devRelease is the only producer variant).
 * The profile is merged into `androidApp/src/main/generated/baselineProfiles` (both flavors run the same code).
 * The journey ([mainJourney]) covers cold start, the first-launch screens, Home with its scrolling feed, the salon
 * list, salon details and the bookings tab; [startup] (`includeInStartupProfile = true`) feeds the Startup Profile
 * (DEX layout of the startup classes) with the launch only.
 */
@RunWith(AndroidJUnit4::class)
class BaselineProfileGenerator {

    @get:Rule
    val rule = BaselineProfileRule()

    /** Startup Profile (DEX layout): cold start up to the first Home frame only, so the primary DEX stays small. */
    @Test
    fun startup() {
        rule.collect(packageName = targetAppId(), includeInStartupProfile = true) {
            launchToHome()
        }
    }

    /** Baseline Profile (AOT): the whole journey; merged with the startup rules into baseline-prof.txt. */
    @Test
    fun journey() {
        rule.collect(packageName = targetAppId(), includeInStartupProfile = false) {
            mainJourney()
        }
    }

    // The baselineprofile Gradle plugin passes the target application id (dev flavor, suffix included).
    private fun targetAppId(): String = InstrumentationRegistry.getArguments().getString(TARGET_APP_ID_ARGUMENT)
        ?: error("$TARGET_APP_ID_ARGUMENT instrumentation argument is missing")

    private companion object {
        const val TARGET_APP_ID_ARGUMENT = "targetAppId"
    }
}

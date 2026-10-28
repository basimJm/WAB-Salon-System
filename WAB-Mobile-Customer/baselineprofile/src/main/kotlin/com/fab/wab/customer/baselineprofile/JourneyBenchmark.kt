package com.fab.wab.customer.baselineprofile

import androidx.benchmark.macro.BaselineProfileMode
import androidx.benchmark.macro.CompilationMode
import androidx.benchmark.macro.FrameTimingMetric
import androidx.benchmark.macro.StartupMode
import androidx.benchmark.macro.StartupTimingMetric
import androidx.benchmark.macro.junit4.MacrobenchmarkRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * CUS-097: measures the main journey (cold start, Home, search, salon details, bookings) without and with the
 * Baseline Profile: `ANDROID_SERIAL=<device> ./gradlew :baselineprofile:connectedDevBenchmarkReleaseAndroidTest`.
 * Results land in `baselineprofile/build/outputs/connected_android_test_additional_output`.
 */
@RunWith(AndroidJUnit4::class)
class JourneyBenchmark {

    @get:Rule
    val rule = MacrobenchmarkRule()

    @Test
    fun journeyWithoutProfile() = measure(CompilationMode.None())

    @Test
    fun journeyWithBaselineProfile() = measure(CompilationMode.Partial(BaselineProfileMode.Require))

    private fun measure(compilationMode: CompilationMode) {
        val packageName = InstrumentationRegistry.getArguments().getString(TARGET_APP_ID_ARGUMENT)
            ?: error("$TARGET_APP_ID_ARGUMENT instrumentation argument is missing")
        rule.measureRepeated(
            packageName = packageName,
            metrics = listOf(StartupTimingMetric(), FrameTimingMetric()),
            iterations = ITERATIONS,
            startupMode = StartupMode.COLD,
            compilationMode = compilationMode,
        ) {
            mainJourney()
        }
    }

    private companion object {
        const val TARGET_APP_ID_ARGUMENT = "targetAppId"
        const val ITERATIONS = 5
    }
}

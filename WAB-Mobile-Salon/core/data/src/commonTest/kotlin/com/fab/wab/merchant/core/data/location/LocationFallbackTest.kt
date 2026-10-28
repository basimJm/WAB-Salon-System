package com.fab.wab.merchant.core.data.location

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.runTest

@OptIn(ExperimentalCoroutinesApi::class) // virtual time (testScheduler.currentTime) proves when the fallback answered
class LocationFallbackTest {

    @Test
    fun aFreshFixWinsWithoutReadingTheLastKnownPosition() = runTest {
        var lastRead = false
        val point = freshOrLastKnown(
            fresh = { FRESH },
            lastKnown = {
                lastRead = true
                LAST
            },
        )
        assertEquals(FRESH, point)
        assertFalse(lastRead)
    }

    @Test
    fun aFreshRequestThatNeverAnswersFallsBackToTheLastKnownPositionInTime() = runTest {
        val point = freshOrLastKnown(fresh = { awaitCancellation() }, lastKnown = { LAST })
        assertEquals(LAST, point)
        // The fallback answered after the fresh-fix bound, before the map picker gives up.
        assertEquals(FRESH_FIX_TIMEOUT_MS, testScheduler.currentTime)
        assertTrue(testScheduler.currentTime < MAP_PICKER_TIMEOUT_MS)
    }

    @Test
    fun noFixAnywhereAnswersNull() = runTest {
        assertNull(freshOrLastKnown<String>(fresh = { null }, lastKnown = { null }))
        val late = freshOrLastKnown(
            fresh = {
                delay(FRESH_FIX_TIMEOUT_MS * 2)
                FRESH
            },
            lastKnown = { null },
        )
        assertNull(late)
    }

    private companion object {
        const val FRESH = "fresh"
        const val LAST = "last"

        /** The map picker's overall bound (`LOCATE_TIMEOUT_MS` in the design system, which core/data cannot see). */
        const val MAP_PICKER_TIMEOUT_MS = 15_000L
    }
}

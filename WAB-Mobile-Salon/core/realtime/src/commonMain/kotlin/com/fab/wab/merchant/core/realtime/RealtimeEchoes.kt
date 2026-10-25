package com.fab.wab.merchant.core.realtime

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlin.time.Duration
import kotlin.time.Duration.Companion.seconds
import kotlin.time.TimeMark
import kotlin.time.TimeSource

/** How close in time an identical event counts as the same emit delivered through a second room (MER-054). */
object RealtimeEchoDefaults {
    private const val ECHO_WINDOW_SECONDS = 1
    val ECHO_WINDOW: Duration = ECHO_WINDOW_SECONDS.seconds
}

/**
 * Drops an event identical (name and payload) to the one just before it within [window]. The server emits a booking
 * change to every room that should hear it (`branch:{id}:all`, `member:{id}`, …), so a member sitting in two of them
 * (a branch manager who is also the booked staff) receives each change twice in the same instant (verified on the
 * local stack, MER-054); a later real change with the same summary is still delivered.
 */
fun Flow<RealtimeEvent>.withoutEchoes(
    window: Duration = RealtimeEchoDefaults.ECHO_WINDOW,
    timeSource: TimeSource = TimeSource.Monotonic,
): Flow<RealtimeEvent> = flow {
    // Per collection: two screens collecting the same source keep their own memory.
    var last: RealtimeEvent? = null
    var lastAt: TimeMark? = null
    collect { event ->
        val echo = event == last && lastAt?.let { it.elapsedNow() < window } == true
        last = event
        lastAt = timeSource.markNow()
        if (!echo) emit(event)
    }
}

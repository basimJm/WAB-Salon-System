package com.fab.wab.merchant.core.realtime

import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.time.TestTimeSource

class RealtimeEchoesTest {

    /** The real `booking.updated` summary (local stack, MER-054 capture): no `updatedAt`, no branch. */
    private fun summary(status: String) = RealtimeEvent(
        RealtimeEvents.BOOKING_UPDATED,
        Json.parseToJsonElement(
            """{"id":"6ade4b09c2cfb0cb993a17e1","referenceNumber":"WAB-HA6EHQ","status":"$status","paymentStatus":"PAY_ON_ARRIVAL",
            |"hasBride":false,"appointmentStart":"2026-10-31T07:00:00.000Z","appointmentEnd":"2026-10-31T07:45:00.000Z",
            |"respondBy":"2026-10-31T08:00:00.000Z","total":"18.000","personsCount":1}""".trimMargin(),
        ),
    )

    @Test
    fun theSameEmitThroughTwoRoomsIsDeliveredOnce() = runTest {
        // What the branch manager's socket received: every change twice in the same millisecond.
        val events = flowOf(
            summary("PENDING"), summary("PENDING"),
            summary("APPROVED"), summary("APPROVED"),
            summary("CANCELLED_BY_SALON"), summary("CANCELLED_BY_SALON"),
        )
        assertEquals(listOf("PENDING", "APPROVED", "CANCELLED_BY_SALON").map(::summary), events.withoutEchoes().toList())
    }

    @Test
    fun anIdenticalEventAfterTheWindowIsANewChange() = runTest {
        val clock = TestTimeSource()
        val events = flow {
            emit(summary("APPROVED"))
            emit(summary("APPROVED"))
            clock += RealtimeEchoDefaults.ECHO_WINDOW
            emit(summary("APPROVED"))
        }
        assertEquals(2, events.withoutEchoes(timeSource = clock).toList().size, "echo dropped, a later reassignment kept")
    }

    @Test
    fun differentEventsWithTheSamePayloadAreKept() = runTest {
        val payload = summary("PENDING").payload
        val events = flowOf(
            RealtimeEvent(RealtimeEvents.BOOKING_REQUESTED, payload),
            RealtimeEvent(RealtimeEvents.BOOKING_UPDATED, payload),
        )
        assertEquals(2, events.withoutEchoes().toList().size)
    }
}

package com.fab.wab.merchant.app.request

import com.fab.wab.merchant.app.resources.Res
import com.fab.wab.merchant.app.resources.close_already
import com.fab.wab.merchant.app.resources.close_done_completed
import com.fab.wab.merchant.app.resources.close_done_no_show
import com.fab.wab.merchant.app.resources.close_open
import com.fab.wab.merchant.core.notification.push.PushKeys
import com.fab.wab.merchant.core.realtime.RealtimeEvents
import com.fab.wab.merchant.feature.bookings.domain.usecase.CloseAction
import com.fab.wab.merchant.feature.bookings.domain.usecase.CloseOutcome
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** MER-086 (BUSINESS_DOMAIN §5.21): close reminder payloads, action identifiers, tap link and outcome texts. */
class BookingClosePushTest {
    private val web = "https://web.example"
    private val reminder = mapOf(
        PushKeys.EVENT to RealtimeEvents.BOOKING_CLOSE_REMINDER,
        PushKeys.BOOKING_ID to "b1",
        ClosePushKeys.REFERENCE to "WAB-1",
        ClosePushKeys.ACTIONS to "COMPLETED,NO_SHOW",
    )

    @Test
    fun reminderAndOverduePushesParseWithTheirActions() {
        val push = closePushOf(reminder)
        assertEquals(ClosePush("b1", "WAB-1", overdue = false, actions = listOf(CloseAction.COMPLETED, CloseAction.NO_SHOW)), push)
        val overdue = closePushOf(reminder + (PushKeys.EVENT to RealtimeEvents.BOOKING_CLOSE_OVERDUE))
        assertTrue(overdue?.overdue == true)
        assertEquals(listOf(CloseAction.NO_SHOW), closePushOf(reminder + (ClosePushKeys.ACTIONS to " NO_SHOW ,UNKNOWN"))?.actions)
        assertEquals(CloseAction.entries, closePushOf(reminder - ClosePushKeys.ACTIONS)?.actions, "no actions key = both")
    }

    @Test
    fun otherPushesOrMissingIdsAreNotCloseReminders() {
        assertNull(closePushOf(reminder + (PushKeys.EVENT to RealtimeEvents.BOOKING_REQUESTED)))
        assertNull(closePushOf(reminder + (PushKeys.BOOKING_ID to " ")))
        assertNull(closePushOf(reminder - PushKeys.EVENT))
    }

    @Test
    fun actionIdentifiersRoundTripAndAPlainTapIsNoAction() {
        CloseAction.entries.forEach { assertEquals(it, BookingCloseCategory.actionOf(BookingCloseCategory.identifierOf(it))) }
        assertNull(BookingCloseCategory.actionOf("com.apple.UNNotificationDefaultActionIdentifier"))
    }

    @Test
    fun tapOpensTheBookingDetails() {
        assertEquals("https://web.example/bookings/b1", closeReminderLink(reminder, web))
        assertNull(closeReminderLink(reminder + (PushKeys.EVENT to RealtimeEvents.BOOKING_UPDATED), web))
    }

    @Test
    fun outcomesHaveTheirTexts() {
        assertEquals(Res.string.close_done_completed, closeOutcomeResource(CloseOutcome.Done(CloseAction.COMPLETED)))
        assertEquals(Res.string.close_done_no_show, closeOutcomeResource(CloseOutcome.Done(CloseAction.NO_SHOW)))
        assertEquals(Res.string.close_already, closeOutcomeResource(CloseOutcome.AlreadyClosed))
        assertEquals(Res.string.close_open, closeOutcomeResource(CloseOutcome.OpenDetails))
    }
}

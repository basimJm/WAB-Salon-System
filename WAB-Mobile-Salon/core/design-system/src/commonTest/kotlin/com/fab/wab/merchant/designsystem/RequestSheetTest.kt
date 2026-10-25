package com.fab.wab.merchant.designsystem

import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.booking.PaymentStatus
import com.fab.wab.merchant.designsystem.components.booking.BookingRequestUi
import com.fab.wab.merchant.designsystem.components.booking.HandledBy
import com.fab.wab.merchant.designsystem.components.booking.RequestPersonUi
import com.fab.wab.merchant.designsystem.components.booking.RequestQueue
import com.fab.wab.merchant.designsystem.components.booking.RequestSheetUi
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlin.time.Duration.Companion.minutes

class RequestSheetTest {
    private val sara = RequestPersonUi("Sara", "Bridal makeup", "Rana", "4:00 PM", isBride = true)
    private val noor = RequestPersonUi("Noor", "Cut & style", "Hiba", "4:00 PM")
    private val request = BookingRequestUi(
        id = "b1", reference = "WAB-24817", customerName = "Sara", persons = listOf(sara, noor),
        date = "Today", time = "4:00 PM", total = "205 JOD", payment = PaymentStatus.DEPOSIT_PAID, age = 1.minutes,
    )

    @Test
    fun queueChipOnlyWhenMoreThanOneRequest() {
        assertFalse(RequestQueue.of(0, 1).showsIndicator)
        val queue = RequestQueue.of(0, 3)
        assertEquals(RequestQueue(1, 3), queue)
        assertTrue(queue.showsIndicator)
        assertTrue(queue.hasNext)
        assertFalse(RequestQueue.of(2, 3).hasNext)
    }

    @Test
    fun queueClampsOutOfRangeValues() {
        assertEquals(RequestQueue(3, 3), RequestQueue.of(7, 3))
        assertEquals(RequestQueue(1, 1), RequestQueue.of(-2, 0))
    }

    @Test
    fun brideFlagComesFromAnyPerson() {
        assertTrue(request.isBride)
        assertFalse(request.copy(persons = listOf(noor)).isBride)
        assertEquals(2, request.personsCount)
        assertEquals(1, request.copy(persons = emptyList()).personsCount)
    }

    @Test
    fun actionsLockWhileAcceptingOrOnceHandledElsewhere() {
        val shown = RequestSheetUi.Request(request, RequestQueue.of(0, 1))
        assertTrue(shown.canAct)
        assertFalse(shown.copy(accepting = true).canAct)
        assertFalse(shown.copy(handledBy = HandledBy("Ahmad", BookingStatus.APPROVED)).canAct)
    }
}

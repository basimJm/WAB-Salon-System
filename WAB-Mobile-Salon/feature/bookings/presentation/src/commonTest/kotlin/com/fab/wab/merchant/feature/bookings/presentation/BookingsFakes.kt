package com.fab.wab.merchant.feature.bookings.presentation

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.booking.PaymentStatus
import com.fab.wab.merchant.core.domain.booking.RefundStatus
import com.fab.wab.merchant.feature.bookings.domain.model.BookingAction
import com.fab.wab.merchant.feature.bookings.domain.model.BookingDetails
import com.fab.wab.merchant.feature.bookings.domain.model.BookingMoney
import com.fab.wab.merchant.feature.bookings.domain.model.BookingPerson
import com.fab.wab.merchant.feature.bookings.domain.model.BookingQuery
import com.fab.wab.merchant.feature.bookings.domain.model.BookingSummary
import com.fab.wab.merchant.feature.bookings.domain.model.ResponseReason
import com.fab.wab.merchant.feature.bookings.domain.model.StaffRef
import com.fab.wab.merchant.feature.bookings.domain.repository.BookingsRepository
import kotlin.time.Instant

internal val START = Instant.parse("2026-10-22T10:00:00Z")
internal val SARA = StaffRef("s1", "Sara")
internal val LINA = StaffRef("s2", "Lina")

internal fun summary(id: String, status: BookingStatus = BookingStatus.PENDING) = BookingSummary(
    id = id,
    reference = "WAB-$id",
    status = status,
    paymentStatus = PaymentStatus.DEPOSIT_PAID,
    hasBride = false,
    start = START,
    end = START,
    respondBy = START,
    personsCount = 1,
    total = "20",
    customerName = "Rana",
    customerPhone = "+962791234567",
    staff = listOf(SARA),
)

internal fun details(id: String = "b1", actions: Set<BookingAction> = setOf(BookingAction.APPROVE, BookingAction.REJECT)) = BookingDetails(
    summary = summary(id),
    refundStatus = RefundStatus.NONE,
    persons = listOf(BookingPerson("Rana", false, START, START, "20", SARA, emptyList())),
    money = BookingMoney("20", "5", "5", "15", ""),
    policy = emptyMap(),
    history = emptyList(),
    rejectionReason = null,
    cancellationReason = null,
    createdAt = null,
    actions = actions,
)

internal fun serverError(code: ErrorCode) = AppResult.Error(AppError.ServerError(code, HTTP_CONFLICT, null))

private const val HTTP_CONFLICT = 409

internal class FakeBookingsRepository : BookingsRepository {
    val pages = mutableMapOf<Int, List<BookingSummary>>()
    var listError: AppResult.Error? = null
    val queries = mutableListOf<Pair<BookingQuery, Int>>()
    var detailsResult: AppResult<BookingDetails> = AppResult.Success(details())
    var detailsCalls = 0
    var actionResult: AppResult<Unit> = AppResult.Success(Unit)
    val actions = mutableListOf<String>()

    override suspend fun list(query: BookingQuery, page: Int, pageSize: Int): AppResult<List<BookingSummary>> {
        queries += query to page
        return listError ?: AppResult.Success(pages[page].orEmpty())
    }

    override suspend fun details(bookingId: String): AppResult<BookingDetails> {
        detailsCalls += 1
        return detailsResult
    }

    override suspend fun approve(bookingId: String) = act("approve:$bookingId")
    override suspend fun reject(bookingId: String, reason: ResponseReason, text: String?) = act("reject:$reason:$text")
    override suspend fun cancel(bookingId: String, reason: ResponseReason, text: String?) = act("cancel:$reason:$text")
    override suspend fun complete(bookingId: String) = act("complete")
    override suspend fun noShow(bookingId: String) = act("noShow")
    override suspend fun reassign(bookingId: String, personIndex: Int, staffId: String) = act("reassign:$personIndex:$staffId")
    override suspend fun staff(): AppResult<List<StaffRef>> = AppResult.Success(listOf(SARA, LINA))

    private fun act(call: String): AppResult<Unit> {
        actions += call
        return actionResult
    }
}

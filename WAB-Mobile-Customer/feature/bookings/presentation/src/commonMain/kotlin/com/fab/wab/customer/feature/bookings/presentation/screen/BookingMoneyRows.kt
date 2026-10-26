package com.fab.wab.customer.feature.bookings.presentation.screen

import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.core.domain.booking.BookingReason
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.core.domain.booking.BookingSummary
import com.fab.wab.customer.core.domain.booking.RefundStatus

/** The labelled amounts of the S15 payment card above the "Remaining" line. */
internal enum class MoneyRowKind { TOTAL, PAID_ONLINE, REFUNDED, PAID_AT_SALON }

internal data class MoneyRow(val kind: MoneyRowKind, val amount: String)

/**
 * PRD S15 money (SRV-170): total and paid online always; refunded once refunded; what was collected in person once the
 * salon marked the booking COMPLETED. "Remaining" is the server's `remaining` as is (0 once the booking is final).
 */
internal fun moneyRowsOf(booking: BookingDetails): List<MoneyRow> = listOfNotNull(
    MoneyRow(MoneyRowKind.TOTAL, booking.money.total),
    MoneyRow(MoneyRowKind.PAID_ONLINE, booking.money.paidOnline),
    MoneyRow(MoneyRowKind.REFUNDED, booking.money.refunded).takeIf { booking.refundStatus == RefundStatus.REFUNDED },
    MoneyRow(MoneyRowKind.PAID_AT_SALON, booking.money.paidAtSalon).takeIf { booking.status == BookingStatus.COMPLETED },
)

/** PRD S14 card: the salon's rejection reason, only on a REJECTED booking. */
internal fun cardRejectionOf(booking: BookingSummary): BookingReason? =
    booking.rejection?.takeIf { booking.status == BookingStatus.REJECTED }

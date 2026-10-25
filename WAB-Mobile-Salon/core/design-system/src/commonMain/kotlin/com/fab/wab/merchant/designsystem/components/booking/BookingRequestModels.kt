package com.fab.wab.merchant.designsystem.components.booking

import androidx.compose.runtime.Immutable
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.booking.PaymentStatus
import kotlin.time.Duration

/** One person of a request: services summary, staff and time (pre-localized by the feature). */
@Immutable
data class RequestPersonUi(
    val name: String,
    val services: String,
    val staff: String,
    val whenText: String,
    val isBride: Boolean = false,
)

/** A new booking request as shown in the real-time sheet (PRD M10); [total] is the formatted JOD amount. */
@Immutable
data class BookingRequestUi(
    val id: String,
    val reference: String,
    val customerName: String,
    val persons: List<RequestPersonUi>,
    val date: String,
    val time: String,
    val total: String,
    val payment: PaymentStatus?,
    val age: Duration,
    /** Branch of the request (MER-063), so the owner knows where the customer is coming. */
    val branch: String? = null,
) {
    val isBride: Boolean get() = persons.any { it.isBride }
    val personsCount: Int get() = persons.size.coerceAtLeast(1)
}

/** 1-based position of the shown request among the queued ones ("1 of 3"). */
@Immutable
data class RequestQueue(val position: Int, val size: Int) {
    val showsIndicator: Boolean get() = size > 1
    val hasNext: Boolean get() = position < size

    companion object {
        /** From a 0-based index; clamps out-of-range values so the label never reads "4 of 3" or "0 of 0". */
        fun of(index: Int, size: Int): RequestQueue {
            val total = size.coerceAtLeast(1)
            return RequestQueue(position = (index + 1).coerceIn(1, total), size = total)
        }
    }
}

/** Another member answered first (PRD M10 "Handled by {member}"); [outcome] picks the closing line. */
@Immutable
data class HandledBy(val memberName: String, val outcome: BookingStatus? = null)

/** What the request sheet shows. */
@Immutable
sealed interface RequestSheetUi {
    data class Request(
        val request: BookingRequestUi,
        val queue: RequestQueue,
        val accepting: Boolean = false,
        val handledBy: HandledBy? = null,
    ) : RequestSheetUi {
        /** Accept / Reject are off while an accept is in flight or once someone else handled the request. */
        val canAct: Boolean get() = !accepting && handledBy == null
    }

    data class Accepted(val reference: String, val hasNext: Boolean) : RequestSheetUi
}

/** User intents raised by the sheet; the host view model (MER-028) answers them. */
sealed interface RequestSheetAction {
    data object Accept : RequestSheetAction
    data object Reject : RequestSheetAction
    data object ViewDetails : RequestSheetAction
    data object Next : RequestSheetAction
    data object ViewBooking : RequestSheetAction
    data object Done : RequestSheetAction
}

object RequestSheetDefaults {
    /** How long the "handled by" state stays before the sheet closes or moves to the next request. */
    const val HANDLED_DISMISS_MS = 2_500L
}

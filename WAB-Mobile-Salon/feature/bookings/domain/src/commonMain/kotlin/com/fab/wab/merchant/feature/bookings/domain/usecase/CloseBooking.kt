package com.fab.wab.merchant.feature.bookings.domain.usecase

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.feature.bookings.domain.model.BookingAction
import com.fab.wab.merchant.feature.bookings.domain.repository.BookingsRepository

/** The two answers of a close reminder (BUSINESS_DOMAIN §5.21; push `actions=COMPLETED,NO_SHOW`). */
enum class CloseAction(val code: String) {
    COMPLETED("COMPLETED"),
    NO_SHOW("NO_SHOW"),
    ;

    companion object {
        fun fromCode(code: String?): CloseAction? = entries.firstOrNull { it.code == code?.trim() }
    }
}

/** What a Completed / No-show tapped on a notification led to. */
sealed interface CloseOutcome {
    data class Done(val action: CloseAction) : CloseOutcome

    /** Another member already closed it (or it is no longer APPROVED): nothing to do, never a blind retry. */
    data object AlreadyClosed : CloseOutcome

    /** Not allowed for this member, or the call failed: the booking details open instead (deep link fallback). */
    data object OpenDetails : CloseOutcome
}

/**
 * Closes a booking from a reminder: the details' `actions` (status, time, permission and own-staff rule applied by the
 * server) decide whether this member may do it; the server answers the rest (CLAUDE.md §8.2: conflict-safe).
 */
class CloseBookingUseCase(private val repository: BookingsRepository) {
    suspend operator fun invoke(bookingId: String, action: CloseAction): CloseOutcome {
        val details = (repository.details(bookingId) as? AppResult.Success)?.data ?: return CloseOutcome.OpenDetails
        val needed = if (action == CloseAction.COMPLETED) BookingAction.COMPLETE else BookingAction.NO_SHOW
        if (needed !in details.actions) {
            val open = details.summary.status == BookingStatus.APPROVED || details.summary.status == BookingStatus.PENDING
            return if (open) CloseOutcome.OpenDetails else CloseOutcome.AlreadyClosed
        }
        val result = if (action == CloseAction.COMPLETED) repository.complete(bookingId) else repository.noShow(bookingId)
        return when {
            result is AppResult.Success -> CloseOutcome.Done(action)
            result is AppResult.Error && result.appError.isClosedAlready() -> CloseOutcome.AlreadyClosed
            else -> CloseOutcome.OpenDetails
        }
    }
}

private fun AppError.isClosedAlready(): Boolean =
    this is AppError.ServerError && (code == ErrorCode.ALREADY_HANDLED || code == ErrorCode.INVALID_TRANSITION)

package com.fab.wab.customer.core.domain.booking

import com.fab.wab.customer.core.domain.salon.BranchRef
import com.fab.wab.customer.core.domain.salon.BusinessType

/** BUSINESS_DOMAIN `RefundStatus`. */
enum class RefundStatus(val code: String) {
    NONE("NONE"), REFUND_PENDING("REFUND_PENDING"), REFUNDED("REFUNDED"), REFUND_FAILED("REFUND_FAILED"), UNKNOWN(""),
    ;

    companion object {
        fun fromCode(code: String?): RefundStatus = entries.firstOrNull { it != UNKNOWN && it.code.equals(code?.trim(), true) } ?: UNKNOWN
    }
}

/** BUSINESS_DOMAIN `FullPaymentRefundRule`. */
enum class FullPaymentRefundRule(val code: String) {
    FULL("FULL"), MINUS_DEPOSIT("MINUS_DEPOSIT"),
    ;

    companion object {
        fun fromCode(code: String?): FullPaymentRefundRule = entries.firstOrNull { it.code.equals(code?.trim(), true) } ?: FULL
    }
}

/** The salon policy snapshotted at booking time (BUSINESS_DOMAIN salon policy; untyped in the contract). */
data class BookingPolicy(
    val cancellationWindowHours: Double,
    val paymentOptions: List<PaymentMethod>,
    val depositPercentage: Double?,
    val depositRefundableOnCustomerCancel: Boolean,
    val fullPaymentRefundOnCustomerCancel: FullPaymentRefundRule,
    val notes: String?,
)

data class BookingService(val name: String, val price: String, val durationMinutes: Int)

data class BookingPerson(
    val name: String,
    val isBride: Boolean,
    val start: String,
    val end: String,
    val subtotal: String,
    val staffId: String?,
    /** First name of the member who serves this person (SRV-170); null = any available, not yet assigned. */
    val staffName: String?,
    val services: List<BookingService>,
    val staffPhotoUrl: String? = null,
    /** The tattoo design image of this person as a short-lived signed URL (§5.23); null when none. */
    val referenceImageUrl: String? = null,
)

/**
 * JOD text amounts as the server computes them; [remaining] is what is still due at the salon (0 once the booking is final)
 * and [paidAtSalon] what was collected in person (non-zero only for COMPLETED) (SRV-170).
 */
data class BookingMoney(
    val total: String,
    val dueOnline: String,
    val paidOnline: String,
    val remaining: String,
    val refunded: String,
    val paidAtSalon: String = ZERO_AMOUNT,
) {
    companion object {
        const val ZERO_AMOUNT = "0"
    }
}

data class BookingReason(val code: String, val text: String?, val at: String)

/** `GET /bookings/{id}` (PRD S15). */
data class BookingDetails(
    val id: String,
    val referenceNumber: String,
    val status: BookingStatus,
    val paymentMethod: PaymentMethod,
    val paymentStatus: PaymentStatus,
    val refundStatus: RefundStatus,
    val hasBride: Boolean,
    val appointmentStart: String,
    val appointmentEnd: String,
    val salonId: String?,
    val salonName: String?,
    val branch: BranchRef? = null,
    val persons: List<BookingPerson>,
    val money: BookingMoney,
    val policy: BookingPolicy?,
    val rejection: BookingReason?,
    val cancellation: BookingReason?,
    val source: BookingSource = BookingSource.CUSTOMER_APP,
    val businessType: BusinessType = BusinessType.SALON,
)

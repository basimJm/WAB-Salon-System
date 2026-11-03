package com.fab.wab.customer.core.domain.booking

import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.BranchRef

/** One row of `GET /bookings` (PRD S14 card); instants are ISO UTC, money is JOD text. */
data class BookingSummary(
    val id: String,
    val referenceNumber: String,
    val status: BookingStatus,
    val paymentMethod: PaymentMethod,
    val paymentStatus: PaymentStatus,
    val hasBride: Boolean,
    val appointmentStart: String,
    val appointmentEnd: String,
    val personsCount: Int,
    val total: String,
    val salonId: String?,
    val salonName: String?,
    val branch: BranchRef? = null,
    val staffNames: List<String>,
    /** The salon's rejection reason; null unless REJECTED (PRD S14 card, SRV-170). */
    val rejection: BookingReason? = null,
    /** Salon, clinic or tattoo studio, snapshotted on the booking (BUSINESS_DOMAIN §5.19, §5.23). */
    val businessType: BusinessType = BusinessType.SALON,
    /** MERCHANT = made by the business for the customer: labelled "Booked by <place>" (§5.20). */
    val source: BookingSource = BookingSource.CUSTOMER_APP,
)

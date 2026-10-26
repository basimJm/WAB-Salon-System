package com.fab.wab.customer.feature.bookings.domain.model

import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.core.domain.salon.BranchRef

/** One S18 step: the salon first, then each distinct staff member who served (PRD S18). */
sealed interface RatingStep {
    val salonId: String

    /** The booked branch: the review is labelled with it (BUSINESS_DOMAIN §5.11); null for bookings made before branches. */
    val branch: BranchRef?

    data class Salon(override val salonId: String, val salonName: String?, override val branch: BranchRef? = null) : RatingStep
    data class Staff(
        override val salonId: String,
        val memberId: String,
        val memberName: String,
        override val branch: BranchRef? = null,
        val memberPhotoUrl: String? = null,
    ) : RatingStep
}

/** No salon id (deleted salon) → nothing to rate. Staff without an id (any available) are skipped; duplicates collapse. */
fun ratingStepsOf(booking: BookingDetails): List<RatingStep> {
    val salonId = booking.salonId ?: return emptyList()
    val staff = booking.persons
        .mapNotNull { person ->
            person.staffId?.let { id -> RatingStep.Staff(salonId, id, person.staffName.orEmpty(), booking.branch, person.staffPhotoUrl) }
        }
        .distinctBy { it.memberId }
    return listOf(RatingStep.Salon(salonId, booking.salonName, booking.branch)) + staff
}

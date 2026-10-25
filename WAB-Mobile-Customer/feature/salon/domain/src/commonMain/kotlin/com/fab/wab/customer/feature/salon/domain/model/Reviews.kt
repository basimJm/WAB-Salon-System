package com.fab.wab.customer.feature.salon.domain.model

import com.fab.wab.customer.core.domain.salon.RatingSummary
import com.fab.wab.customer.core.domain.salon.Review

/** What a review list / form is about (PRD S08 salon, S09 staff member). */
sealed interface ReviewTarget {
    val salonId: String

    data class Salon(override val salonId: String) : ReviewTarget
    data class Staff(override val salonId: String, val memberId: String) : ReviewTarget
}

data class ReviewsPage(val items: List<Review>, val summary: RatingSummary)

/** A review to submit; the server keeps it PENDING until admin approval (PRD S08 rules). */
/** [branchId] labels the review with a branch (from the booking being rated, BUSINESS_DOMAIN §5.11); null = salon-wide. */
data class ReviewDraft(val rating: Int, val comment: String?, val branchId: String? = null)

object ReviewDefaults {
    const val PAGE_SIZE = 10
    const val FIRST_PAGE = 1
    /** Contract: `rating` 1–5, `comment` ≤ 1000 characters. */
    const val MIN_RATING = 1
    const val MAX_RATING = 5
    const val MAX_COMMENT_LENGTH = 1000
}

package com.fab.wab.customer.designsystem.components.domain

import androidx.compose.runtime.Immutable

/**
 * Presentation models of the shared domain cards (Design Script §1.2). The design system cannot depend on
 * `core/domain`, so features map their entities to these; every text is already localized by the caller.
 */
@Immutable
data class SalonCardUi(
    val id: String,
    val name: String,
    val imageUrl: String?,
    val rating: Float,
    val locationText: String,
    val description: String,
    val isOpen: Boolean,
    /** Today's hours, already formatted 12-hour in the user's language (e.g. "8:00 ص – 4:00 م"); null when closed. */
    val todayHours: String?,
    val isFavorite: Boolean,
)

@Immutable
data class ServiceCardUi(
    val id: String,
    val name: String,
    val imageUrl: String?,
    val description: String,
    /** Salon-service variants only (S07): minutes and the JOD price text; null in the catalog variants. */
    val durationMinutes: Int? = null,
    val priceText: String? = null,
)

@Immutable
data class ReviewUi(
    val id: String,
    val authorName: String,
    val rating: Float,
    val comment: String,
    val dateText: String,
)

@Immutable
data class StaffItemUi(
    val id: String,
    val name: String,
    val imageUrl: String?,
    val onDutyToday: Boolean,
)

/** Rating value shown next to the stars: one decimal, never negative, capped at the star count. */
fun ratingValueText(rating: Float, maxRating: Int = MAX_RATING): String {
    val clamped = rating.coerceIn(0f, maxRating.toFloat())
    val tenths = (clamped * TENTHS).toInt()
    return "${tenths / TENTHS}.${tenths % TENTHS}"
}

/**
 * "Open · 8:00 AM – 4:00 PM" while open, "Closed · 8:00 AM – 4:00 PM" outside today's hours, and the closed-today label
 * only when there are no hours today (day off / closure) (PRD 8.0, S03/S07 status line).
 */
fun hoursLine(
    isOpen: Boolean,
    todayHours: String?,
    openLabel: String,
    closedLabel: String,
    separator: String,
    closedNowLabel: String,
): String = when {
    todayHours.isNullOrBlank() -> closedLabel
    isOpen -> openLabel + separator + todayHours
    else -> closedNowLabel + separator + todayHours
}

/** Staff rows show the first name only (PRD S07 item 8). */
fun firstNameOf(fullName: String): String = fullName.trim().split(WHITESPACE).firstOrNull().orEmpty()

private const val MAX_RATING = 5
private const val TENTHS = 10
private val WHITESPACE = Regex("\\s+")

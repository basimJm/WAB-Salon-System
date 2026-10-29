package com.fab.wab.customer.core.domain.salon

import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.session.Gender

/** BUSINESS_DOMAIN `DayOfWeek` (week starts Saturday in Jordan). */
enum class DayOfWeek(val code: String) {
    SAT("SAT"), SUN("SUN"), MON("MON"), TUE("TUE"), WED("WED"), THU("THU"), FRI("FRI"),
    ;

    companion object {
        fun fromCode(code: String?): DayOfWeek? = entries.firstOrNull { it.code.equals(code?.trim(), ignoreCase = true) }
    }
}

enum class StaffStatus(val code: String) {
    ON_DUTY("ON_DUTY"), ON_LEAVE("ON_LEAVE"), DAY_OFF("DAY_OFF"),
    ;

    companion object {
        fun fromCode(code: String?): StaffStatus = entries.firstOrNull { it.code.equals(code?.trim(), ignoreCase = true) } ?: DAY_OFF
    }
}

enum class MediaType { IMAGE, VIDEO }

data class RatingSummary(val average: Float, val count: Int)

data class DaySchedule(val day: DayOfWeek?, val isOff: Boolean, val hours: OpeningHours?)

/** An exceptional closure (PRD S07 item 7), dates as the server sends them (ISO). */
data class Closure(val from: String, val to: String, val reason: String)

data class StaffPreview(
    val id: String,
    val firstName: String,
    val photoUrl: String?,
    val status: StaffStatus,
    val branchId: String? = null,
)

/** A salon's own service (PRD S07 item 10); price is JOD text, tax-inclusive. */
data class SalonService(
    val id: String,
    val catalogServiceId: String,
    val name: String,
    val imageUrl: String?,
    val description: String?,
    val price: String,
    val durationMinutes: Int,
    val mediaUrls: List<String>,
    val branchId: String? = null,
    /** VIP service: bookable only for a person marked as bride (PRD S16 step 1, SRV-170). */
    val brideOnly: Boolean = false,
)

data class GalleryItem(val id: String, val type: MediaType, val url: String, val thumbnailUrl: String?)

/** A review; [branch] is a label only (BUSINESS_DOMAIN §5.11: ratings are salon-wide). */
data class Review(
    val id: String,
    val customerName: String,
    val rating: Float,
    val comment: String?,
    val createdAt: String,
    val branch: BranchRef? = null,
)

data class ReviewsPreview(val summary: RatingSummary, val latest: List<Review>)

/** `GET /salons/{id}` (PRD S07); the top-level place fields mirror the main branch, [branches] lists the bookable ones (main first). */
data class SalonDetails(
    val id: String,
    val name: String,
    val businessType: BusinessType,
    val audience: Audience?,
    val coverUrl: String?,
    val profileImageUrl: String?,
    val description: String?,
    val locationText: String?,
    val location: LocationData?,
    val phone: String?,
    val whatsapp: String?,
    val rating: RatingSummary,
    val isOpenNow: Boolean,
    val todayHours: OpeningHours?,
    val closedReason: String?,
    val weeklySchedule: List<DaySchedule>,
    val upcomingClosures: List<Closure>,
    val staff: List<StaffPreview>,
    val services: List<SalonService>,
    val gallery: List<GalleryItem>,
    val isFavorite: Boolean,
    val reviews: ReviewsPreview,
    val branches: List<SalonBranch> = emptyList(),
) {
    /** The gender every booking person must have, or null for a BOTH salon or a clinic (§5.19). */
    val lockedGender: Gender? get() = BusinessRules.lockedGender(businessType, audience)

    /** Bride bookings only for FEMALE or BOTH salons (§5.19). */
    val allowsBride: Boolean get() = BusinessRules.allowsBride(businessType, audience)
}

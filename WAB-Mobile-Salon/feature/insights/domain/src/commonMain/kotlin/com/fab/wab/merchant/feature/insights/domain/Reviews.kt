package com.fab.wab.merchant.feature.insights.domain

import com.fab.wab.merchant.core.domain.AppResult

/** M20 tabs: the salon's own reviews or the staff reviews (`target` of `GET /reviews`). */
enum class ReviewTarget { SALON, STAFF }

data class ReviewStaff(val id: String, val firstName: String)

/** One published review (only admin-approved reviews reach the merchant, BUSINESS_DOMAIN rule 11). */
data class Review(
    val id: String,
    val customerName: String,
    val rating: Double,
    val comment: String?,
    val createdAt: String,
    val branchName: String?,
    val staff: ReviewStaff?,
)

/** Average, count and the number of reviews per star (1..5, missing stars = 0). */
data class ReviewSummary(val average: Double, val count: Int, val distribution: Map<Int, Int>) {
    /** Share of [star] among all reviews (0f..1f) for the distribution bars. */
    fun share(star: Int): Float = if (count <= 0) 0f else (distribution[star] ?: 0).toFloat() / count

    companion object {
        val EMPTY = ReviewSummary(0.0, 0, emptyMap())
    }
}

/** [hasMore] from the pagination meta (a full page when the meta is missing). */
data class ReviewsPage(val items: List<Review>, val summary: ReviewSummary, val hasMore: Boolean)

object ReviewsDefaults {
    const val FIRST_PAGE = 1
    const val PAGE_SIZE = 20
    const val MIN_STARS = 1
    const val MAX_STARS = 5

    /** Highest star first, as the distribution is drawn. */
    val STARS: List<Int> = (MAX_STARS downTo MIN_STARS).toList()
}

/** `GET /reviews` (REVIEWS_VIEW). [memberId] narrows the staff tab; [branchId] = the owner's branch choice. */
interface ReviewsRepository {
    suspend fun reviews(target: ReviewTarget, memberId: String?, branchId: String?, page: Int): AppResult<ReviewsPage>
}

/** Staff of the loaded reviews, first seen first, merged with the ones already known (the staff selector). */
fun mergeStaff(known: List<ReviewStaff>, reviews: List<Review>): List<ReviewStaff> =
    (known + reviews.mapNotNull { it.staff }).distinctBy { it.id }

package com.fab.wab.customer.feature.salon.data.repository

import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdReviewsData
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdStaffByMemberIdReviewsData
import com.fab.wab.customer.core.data.contract.generated.PostSalonsBySalonIdReviewsBody
import com.fab.wab.customer.core.data.contract.generated.PostSalonsBySalonIdStaffByMemberIdReviewsBody
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.domain.salon.BranchRef
import com.fab.wab.customer.core.domain.salon.RatingSummary
import com.fab.wab.customer.core.domain.salon.Review
import com.fab.wab.customer.core.network.safeApiCall
import com.fab.wab.customer.feature.salon.data.remote.ReviewsApi
import com.fab.wab.customer.feature.salon.domain.model.ReviewDraft
import com.fab.wab.customer.feature.salon.domain.model.ReviewTarget
import com.fab.wab.customer.feature.salon.domain.model.ReviewsPage
import com.fab.wab.customer.feature.salon.domain.repository.ReviewsRepository

class ReviewsRepositoryImpl(private val api: ReviewsApi) : ReviewsRepository {

    override suspend fun list(target: ReviewTarget, page: Int, pageSize: Int): AppResult<ReviewsPage> = when (target) {
        is ReviewTarget.Salon -> safeApiCall { api.salonReviews(target.salonId, page, pageSize) }.mapSuccess { it.data.toDomain() }
        is ReviewTarget.Staff ->
            safeApiCall { api.staffReviews(target.salonId, target.memberId, page, pageSize) }.mapSuccess { it.data.toDomain() }
    }

    override suspend fun submit(target: ReviewTarget, draft: ReviewDraft): AppResult<Unit> = when (target) {
        is ReviewTarget.Salon -> {
            val body = PostSalonsBySalonIdReviewsBody(draft.rating, draft.comment, draft.branchId)
            safeApiCall { api.submitSalonReview(target.salonId, body) }.mapSuccess { }
        }
        is ReviewTarget.Staff -> {
            val body = PostSalonsBySalonIdStaffByMemberIdReviewsBody(draft.rating, draft.comment, draft.branchId)
            safeApiCall { api.submitStaffReview(target.salonId, target.memberId, body) }.mapSuccess { }
        }
    }
}

fun GetSalonsBySalonIdReviewsData.toDomain(): ReviewsPage = ReviewsPage(
    items = items.map {
        Review(it.id, it.customerName, it.rating.toFloat(), it.comment, it.createdAt, it.branch?.let { b -> BranchRef(b.id, b.name) })
    },
    summary = RatingSummary(summary.avg.toFloat(), summary.count.toInt()),
)

fun GetSalonsBySalonIdStaffByMemberIdReviewsData.toDomain(): ReviewsPage = ReviewsPage(
    items = items.map {
        Review(it.id, it.customerName, it.rating.toFloat(), it.comment, it.createdAt, it.branch?.let { b -> BranchRef(b.id, b.name) })
    },
    summary = RatingSummary(summary.avg.toFloat(), summary.count.toInt()),
)

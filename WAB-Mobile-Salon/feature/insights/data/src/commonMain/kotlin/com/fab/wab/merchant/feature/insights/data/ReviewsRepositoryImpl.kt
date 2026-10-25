package com.fab.wab.merchant.feature.insights.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetReviewsData
import com.fab.wab.merchant.core.data.contract.generated.GetReviewsDataItemsItem
import com.fab.wab.merchant.core.data.contract.generated.GetReviewsDataSummary
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.insights.domain.Review
import com.fab.wab.merchant.feature.insights.domain.ReviewStaff
import com.fab.wab.merchant.feature.insights.domain.ReviewSummary
import com.fab.wab.merchant.feature.insights.domain.ReviewTarget
import com.fab.wab.merchant.feature.insights.domain.ReviewsDefaults
import com.fab.wab.merchant.feature.insights.domain.ReviewsPage
import com.fab.wab.merchant.feature.insights.domain.ReviewsRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.doubleOrNull

/** Query names of `GET /reviews` (contract). */
internal object ReviewsParams {
    const val PAGE = "page"
    const val PAGE_SIZE = "pageSize"
    const val TARGET = "target"
    const val MEMBER_ID = "memberId"
    const val BRANCH_ID = "branchId"
}

class ReviewsApi(private val client: HttpClient) {
    suspend fun reviews(target: ReviewTarget, memberId: String?, branchId: String?, page: Int): BaseResponse<GetReviewsData> =
        client.get(MerchantOperations.getReviews.path) {
            parameter(ReviewsParams.PAGE, page)
            parameter(ReviewsParams.PAGE_SIZE, ReviewsDefaults.PAGE_SIZE)
            parameter(ReviewsParams.TARGET, target.name)
            memberId?.let { parameter(ReviewsParams.MEMBER_ID, it) }
            branchId?.let { parameter(ReviewsParams.BRANCH_ID, it) }
        }.body()
}

fun GetReviewsDataItemsItem.toDomain() = Review(
    id = id,
    customerName = customerName,
    rating = rating,
    comment = comment?.takeIf { it.isNotBlank() },
    createdAt = createdAt,
    branchName = branch?.name,
    staff = staff?.let { ReviewStaff(it.id, it.firstName) },
)

/** `distribution` keys are "1".."5"; values arrive as JSON numbers (anything else counts as 0). */
fun GetReviewsDataSummary.toDomain() = ReviewSummary(
    average = avg,
    count = count.toInt(),
    distribution = ReviewsDefaults.STARS.associateWith { star ->
        ((distribution[star.toString()] as? JsonPrimitive)?.doubleOrNull ?: 0.0).toInt()
    },
)

fun BaseResponse<GetReviewsData>.toPage() = ReviewsPage(
    items = data.items.map { it.toDomain() },
    summary = data.summary.toDomain(),
    hasMore = meta?.hasMore ?: (data.items.size >= ReviewsDefaults.PAGE_SIZE),
)

class ReviewsRepositoryImpl(private val api: ReviewsApi) : ReviewsRepository {
    override suspend fun reviews(target: ReviewTarget, memberId: String?, branchId: String?, page: Int): AppResult<ReviewsPage> =
        safeApiCall { api.reviews(target, memberId, branchId, page) }.mapSuccess { it.toPage() }
}

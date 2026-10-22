package com.fab.wab.customer.feature.salon.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdReviewsData
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdStaffByMemberIdReviewsData
import com.fab.wab.customer.core.data.contract.generated.PostSalonsBySalonIdReviewsBody
import com.fab.wab.customer.core.data.contract.generated.PostSalonsBySalonIdReviewsData
import com.fab.wab.customer.core.data.contract.generated.PostSalonsBySalonIdStaffByMemberIdReviewsBody
import com.fab.wab.customer.core.data.contract.generated.PostSalonsBySalonIdStaffByMemberIdReviewsData
import com.fab.wab.customer.core.data.contract.pathWith
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody

class ReviewsApi(private val client: HttpClient) {
    suspend fun salonReviews(salonId: String, page: Int, pageSize: Int): BaseResponse<GetSalonsBySalonIdReviewsData> {
        val op = CustomerOperations.getSalonsBySalonIdReviews
        return client.get(op.pathWith(op.pathParams[0] to salonId)) {
            parameter(QUERY_PAGE, page)
            parameter(QUERY_PAGE_SIZE, pageSize)
        }.body()
    }

    suspend fun staffReviews(
        salonId: String,
        memberId: String,
        page: Int,
        pageSize: Int,
    ): BaseResponse<GetSalonsBySalonIdStaffByMemberIdReviewsData> {
        val op = CustomerOperations.getSalonsBySalonIdStaffByMemberIdReviews
        return client.get(op.pathWith(op.pathParams[0] to salonId, op.pathParams[1] to memberId)) {
            parameter(QUERY_PAGE, page)
            parameter(QUERY_PAGE_SIZE, pageSize)
        }.body()
    }

    suspend fun submitSalonReview(salonId: String, body: PostSalonsBySalonIdReviewsBody): BaseResponse<PostSalonsBySalonIdReviewsData> {
        val op = CustomerOperations.postSalonsBySalonIdReviews
        return client.post(op.pathWith(op.pathParams[0] to salonId)) { setBody(body) }.body()
    }

    suspend fun submitStaffReview(
        salonId: String,
        memberId: String,
        body: PostSalonsBySalonIdStaffByMemberIdReviewsBody,
    ): BaseResponse<PostSalonsBySalonIdStaffByMemberIdReviewsData> {
        val op = CustomerOperations.postSalonsBySalonIdStaffByMemberIdReviews
        return client.post(op.pathWith(op.pathParams[0] to salonId, op.pathParams[1] to memberId)) { setBody(body) }.body()
    }

    private companion object {
        const val QUERY_PAGE = "page"
        const val QUERY_PAGE_SIZE = "pageSize"
    }
}

package com.fab.wab.customer.feature.salon.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.feature.salon.domain.model.ReviewDraft
import com.fab.wab.customer.feature.salon.domain.model.ReviewTarget
import com.fab.wab.customer.feature.salon.domain.model.ReviewsPage

/** `GET` / `POST /salons/{id}/reviews` and `/salons/{id}/staff/{memberId}/reviews` (approved reviews only). */
interface ReviewsRepository {
    suspend fun list(target: ReviewTarget, page: Int, pageSize: Int): AppResult<ReviewsPage>

    suspend fun submit(target: ReviewTarget, draft: ReviewDraft): AppResult<Unit>
}

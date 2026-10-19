package com.fab.wab.customer.feature.salon.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.feature.salon.domain.model.ReviewDefaults
import com.fab.wab.customer.feature.salon.domain.model.ReviewDraft
import com.fab.wab.customer.feature.salon.domain.model.ReviewTarget
import com.fab.wab.customer.feature.salon.domain.model.ReviewsPage
import com.fab.wab.customer.feature.salon.domain.repository.ReviewsRepository

class LoadReviewsUseCase(private val repository: ReviewsRepository) {
    suspend operator fun invoke(target: ReviewTarget, page: Int): AppResult<ReviewsPage> =
        repository.list(target, page, ReviewDefaults.PAGE_SIZE)
}

/** Validation of the form (PRD S08: rating 1–5 + optional comment); null when the draft is not submittable. */
fun reviewDraftOf(rating: Int, comment: String): ReviewDraft? {
    if (rating !in ReviewDefaults.MIN_RATING..ReviewDefaults.MAX_RATING) return null
    val text = comment.trim().takeIf { it.isNotEmpty() } ?: return ReviewDraft(rating, null)
    if (text.length > ReviewDefaults.MAX_COMMENT_LENGTH) return null
    return ReviewDraft(rating, text)
}

class SubmitReviewUseCase(private val repository: ReviewsRepository) {
    suspend operator fun invoke(target: ReviewTarget, draft: ReviewDraft): AppResult<Unit> = repository.submit(target, draft)
}

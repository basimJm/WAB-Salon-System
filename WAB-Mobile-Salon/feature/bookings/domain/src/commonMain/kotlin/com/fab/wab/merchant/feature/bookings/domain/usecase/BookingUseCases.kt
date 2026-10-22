package com.fab.wab.merchant.feature.bookings.domain.usecase

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.feature.bookings.domain.model.ResponseReason

/** PRD M09: a reason is required to reject / cancel; OTHER needs its text (≤ 300 characters). */
fun isReasonValid(reason: ResponseReason?, text: String, maxLength: Int): Boolean = when (reason) {
    null -> false
    ResponseReason.OTHER -> text.trim().let { it.isNotEmpty() && it.length <= maxLength }
    else -> text.trim().length <= maxLength
}

/** How a failed booking action is handled (CLAUDE.md §8.2: conflict-safe, never a blind retry). */
enum class ActionFailure { ALREADY_HANDLED, CONFLICT, OTHER }

fun actionFailureOf(error: AppError): ActionFailure = when ((error as? AppError.ServerError)?.code) {
    ErrorCode.ALREADY_HANDLED -> ActionFailure.ALREADY_HANDLED
    ErrorCode.SCHEDULE_CONFLICT, ErrorCode.SLOT_TAKEN, ErrorCode.STAFF_NOT_ELIGIBLE, ErrorCode.INVALID_TRANSITION, ErrorCode.CONFLICT ->
        ActionFailure.CONFLICT
    else -> ActionFailure.OTHER
}

/** Unwraps an action result into its failure kind (null on success). */
fun AppResult<Unit>.failure(): Pair<ActionFailure, AppError>? = (this as? AppResult.Error)?.let { actionFailureOf(it.appError) to it.appError }

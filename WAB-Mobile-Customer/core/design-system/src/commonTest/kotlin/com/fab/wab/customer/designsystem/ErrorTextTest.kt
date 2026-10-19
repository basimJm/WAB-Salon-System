package com.fab.wab.customer.designsystem

import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.designsystem.components.feedback.ERROR_CODE_STRINGS
import com.fab.wab.customer.designsystem.components.feedback.ErrorAction
import com.fab.wab.customer.designsystem.components.feedback.errorActionLabel
import com.fab.wab.customer.designsystem.components.feedback.errorActionOf
import com.fab.wab.customer.designsystem.components.feedback.errorCodeResource
import com.fab.wab.customer.designsystem.components.feedback.errorResource
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.state_error_message
import com.fab.wab.customer.designsystem.resources.state_offline_message
import com.fab.wab.customer.designsystem.resources.state_retry
import kotlin.test.Test
import kotlin.test.assertEquals

class ErrorTextTest {

    @Test
    fun everyErrorCodeHasItsOwnString() {
        assertEquals(ErrorCode.entries.toSet(), ERROR_CODE_STRINGS.keys)
        assertEquals(ErrorCode.entries.size, ERROR_CODE_STRINGS.values.toSet().size)
    }

    @Test
    fun errorsMapToTheRightResource() {
        val server = AppError.ServerError(ErrorCode.SLOT_TAKEN, statusCode = 409, message = "raw")
        assertEquals(errorCodeResource(ErrorCode.SLOT_TAKEN), errorResource(server))
        assertEquals(Res.string.state_offline_message, errorResource(AppError.NetworkError("x")))
        assertEquals(Res.string.state_error_message, errorResource(AppError.ParseError("x")))
        assertEquals(Res.string.state_error_message, errorResource(AppError.HttpError(502, null)))
    }

    @Test
    fun everyErrorCodeHasAHandlingPathAndLabelsFollowIt() {
        val actions = ErrorCode.entries.associateWith(::errorActionOf)
        assertEquals(ErrorCode.entries.size, actions.size)
        assertEquals(ErrorAction.LOGIN, errorActionOf(ErrorCode.UNAUTHORIZED))
        assertEquals(ErrorAction.UPDATE, errorActionOf(ErrorCode.UPDATE_REQUIRED))
        assertEquals(ErrorAction.RETRY, errorActionOf(ErrorCode.SLOT_TAKEN))
        assertEquals(ErrorAction.DISMISS, errorActionOf(ErrorCode.GENDER_MISMATCH))
        assertEquals(ErrorAction.RETRY, errorActionOf(AppError.NetworkError("offline")))
        assertEquals(ErrorAction.CONTACT, errorActionOf(AppError.UnknownError("boom")))
        assertEquals(Res.string.state_retry, errorActionLabel(ErrorAction.RETRY))
        assertEquals(null, errorActionLabel(ErrorAction.DISMISS))
    }
}

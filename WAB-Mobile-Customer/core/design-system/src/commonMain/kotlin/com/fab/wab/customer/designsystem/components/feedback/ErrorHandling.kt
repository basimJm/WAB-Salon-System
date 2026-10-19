package com.fab.wab.customer.designsystem.components.feedback

import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.state_action_contact
import com.fab.wab.customer.designsystem.resources.state_action_login
import com.fab.wab.customer.designsystem.resources.state_action_update
import com.fab.wab.customer.designsystem.resources.state_retry
import org.jetbrains.compose.resources.StringResource

/** What the user can do about an error (CUS-059 handling path): retry the request, sign in, contact support, update, or go back. */
enum class ErrorAction { RETRY, LOGIN, CONTACT, UPDATE, DISMISS }

/** The handling path of every server code (BUSINESS_DOMAIN §11); the policy check `error-codes` keeps this exhaustive. */
fun errorActionOf(code: ErrorCode): ErrorAction = when (code) {
    ErrorCode.UNAUTHORIZED, ErrorCode.ACCOUNT_BLOCKED, ErrorCode.MEMBER_INACTIVE, ErrorCode.PHONE_NOT_REGISTERED -> ErrorAction.LOGIN
    ErrorCode.FORBIDDEN, ErrorCode.PERMISSION_DENIED, ErrorCode.OWNER_REQUIRED, ErrorCode.LAST_OWNER, ErrorCode.INTERNAL,
    ErrorCode.UNKNOWN, -> ErrorAction.CONTACT
    ErrorCode.UPDATE_REQUIRED -> ErrorAction.UPDATE
    ErrorCode.RATE_LIMITED, ErrorCode.MAINTENANCE, ErrorCode.NOT_FOUND, ErrorCode.CONFLICT, ErrorCode.SALON_NOT_FOUND,
    ErrorCode.SERVICE_UNAVAILABLE, ErrorCode.SLOT_UNAVAILABLE, ErrorCode.SLOT_TAKEN, ErrorCode.DRAFT_EXPIRED, ErrorCode.PAYMENT_FAILED,
    ErrorCode.PAYMENT_NOT_VERIFIED, ErrorCode.OTP_EXPIRED, ErrorCode.UPLOAD_INVALID, ErrorCode.UPLOAD_TOO_LARGE, ErrorCode.SCHEDULE_CONFLICT,
    -> ErrorAction.RETRY
    ErrorCode.VALIDATION_ERROR, ErrorCode.OTP_BLOCKED, ErrorCode.OTP_INVALID, ErrorCode.PHONE_ALREADY_REGISTERED, ErrorCode.SALON_NOT_BOOKABLE,
    ErrorCode.SALON_CLOSED, ErrorCode.GENDER_MISMATCH, ErrorCode.TOO_MANY_COMPANIONS, ErrorCode.BRIDE_ONLY_SERVICE, ErrorCode.STAFF_NOT_ELIGIBLE,
    ErrorCode.DATE_OUT_OF_RANGE, ErrorCode.PAYMENT_OPTION_NOT_ALLOWED, ErrorCode.INVALID_TRANSITION, ErrorCode.CANCELLATION_WINDOW_PASSED,
    ErrorCode.TOO_EARLY_TO_COMPLETE, ErrorCode.ALREADY_HANDLED, -> ErrorAction.DISMISS
}

/** Connectivity and transport failures are always retried; server errors follow their code. */
fun errorActionOf(error: AppError): ErrorAction = when (error) {
    is AppError.ServerError -> errorActionOf(error.code)
    is AppError.NetworkError, is AppError.HttpError, is AppError.ParseError -> ErrorAction.RETRY
    is AppError.UnknownError -> ErrorAction.CONTACT
}

/** Button label of an action; null for [ErrorAction.DISMISS] (the message alone is the handling). */
fun errorActionLabel(action: ErrorAction): StringResource? = when (action) {
    ErrorAction.RETRY -> Res.string.state_retry
    ErrorAction.LOGIN -> Res.string.state_action_login
    ErrorAction.CONTACT -> Res.string.state_action_contact
    ErrorAction.UPDATE -> Res.string.state_action_update
    ErrorAction.DISMISS -> null
}

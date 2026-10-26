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
    in LOGIN_CODES -> ErrorAction.LOGIN
    in CONTACT_CODES -> ErrorAction.CONTACT
    ErrorCode.UPDATE_REQUIRED -> ErrorAction.UPDATE
    in RETRY_CODES -> ErrorAction.RETRY
    else -> ErrorAction.DISMISS
}

private val LOGIN_CODES = setOf(
    ErrorCode.UNAUTHORIZED, ErrorCode.ACCOUNT_BLOCKED, ErrorCode.MEMBER_INACTIVE, ErrorCode.PHONE_NOT_REGISTERED,
)
private val CONTACT_CODES = setOf(
    ErrorCode.FORBIDDEN, ErrorCode.PERMISSION_DENIED, ErrorCode.OWNER_REQUIRED, ErrorCode.LAST_OWNER, ErrorCode.INTERNAL, ErrorCode.UNKNOWN,
    ErrorCode.BRANCH_SCOPE_DENIED,
)
private val RETRY_CODES = setOf(
    ErrorCode.RATE_LIMITED, ErrorCode.MAINTENANCE, ErrorCode.NOT_FOUND, ErrorCode.CONFLICT, ErrorCode.SALON_NOT_FOUND,
    ErrorCode.SERVICE_UNAVAILABLE, ErrorCode.SLOT_UNAVAILABLE, ErrorCode.SLOT_TAKEN, ErrorCode.DRAFT_EXPIRED, ErrorCode.PAYMENT_FAILED,
    ErrorCode.PAYMENT_NOT_VERIFIED, ErrorCode.OTP_EXPIRED, ErrorCode.UPLOAD_INVALID, ErrorCode.UPLOAD_TOO_LARGE,
    ErrorCode.SCHEDULE_CONFLICT, ErrorCode.BRANCH_NOT_FOUND,
)

/** Business-rule codes whose message is the whole handling (no button). Listed so the policy check sees every code. */
private val DISMISS_CODES = setOf(
    ErrorCode.VALIDATION_ERROR, ErrorCode.OTP_BLOCKED, ErrorCode.OTP_INVALID, ErrorCode.OTP_DELIVERY_FAILED,
    ErrorCode.PHONE_ALREADY_REGISTERED,
    ErrorCode.SALON_NOT_BOOKABLE,
    ErrorCode.SALON_CLOSED, ErrorCode.GENDER_MISMATCH, ErrorCode.TOO_MANY_COMPANIONS, ErrorCode.BRIDE_ONLY_SERVICE,
    ErrorCode.STAFF_NOT_ELIGIBLE,
    ErrorCode.DATE_OUT_OF_RANGE, ErrorCode.PAYMENT_OPTION_NOT_ALLOWED, ErrorCode.INVALID_TRANSITION, ErrorCode.CANCELLATION_WINDOW_PASSED,
    ErrorCode.TOO_EARLY_TO_COMPLETE, ErrorCode.ALREADY_HANDLED, ErrorCode.CURRENT_PASSWORD_INVALID, ErrorCode.EMAIL_ALREADY_USED,
    ErrorCode.BRANCH_NOT_BOOKABLE, ErrorCode.BRANCH_REQUIRED, ErrorCode.BRANCH_LIMIT_REACHED, ErrorCode.BRANCH_HAS_UPCOMING_BOOKINGS,
    ErrorCode.LAST_BRANCH,
)

/** All codes are classified exactly once (checked by `ErrorTextTest`). */
internal val CLASSIFIED_CODES: Set<ErrorCode> = LOGIN_CODES + CONTACT_CODES + setOf(ErrorCode.UPDATE_REQUIRED) + RETRY_CODES + DISMISS_CODES

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

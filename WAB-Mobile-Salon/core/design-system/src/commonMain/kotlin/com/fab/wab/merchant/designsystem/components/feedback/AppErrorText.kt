package com.fab.wab.merchant.designsystem.components.feedback

import androidx.compose.runtime.Composable
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.error_code_validation_error
import com.fab.wab.merchant.designsystem.resources.error_code_unauthorized
import com.fab.wab.merchant.designsystem.resources.error_code_forbidden
import com.fab.wab.merchant.designsystem.resources.error_code_permission_denied
import com.fab.wab.merchant.designsystem.resources.error_code_not_found
import com.fab.wab.merchant.designsystem.resources.error_code_conflict
import com.fab.wab.merchant.designsystem.resources.error_code_rate_limited
import com.fab.wab.merchant.designsystem.resources.error_code_internal
import com.fab.wab.merchant.designsystem.resources.error_code_otp_blocked
import com.fab.wab.merchant.designsystem.resources.error_code_otp_invalid
import com.fab.wab.merchant.designsystem.resources.error_code_otp_delivery_failed
import com.fab.wab.merchant.designsystem.resources.error_code_otp_expired
import com.fab.wab.merchant.designsystem.resources.error_code_phone_not_registered
import com.fab.wab.merchant.designsystem.resources.error_code_phone_already_registered
import com.fab.wab.merchant.designsystem.resources.error_code_account_blocked
import com.fab.wab.merchant.designsystem.resources.error_code_member_inactive
import com.fab.wab.merchant.designsystem.resources.error_code_salon_not_found
import com.fab.wab.merchant.designsystem.resources.error_code_salon_not_bookable
import com.fab.wab.merchant.designsystem.resources.error_code_salon_closed
import com.fab.wab.merchant.designsystem.resources.error_code_branch_not_found
import com.fab.wab.merchant.designsystem.resources.error_code_branch_not_bookable
import com.fab.wab.merchant.designsystem.resources.error_code_branch_required
import com.fab.wab.merchant.designsystem.resources.error_code_branch_limit_reached
import com.fab.wab.merchant.designsystem.resources.error_code_branch_has_upcoming_bookings
import com.fab.wab.merchant.designsystem.resources.error_code_last_branch
import com.fab.wab.merchant.designsystem.resources.error_code_branch_scope_denied
import com.fab.wab.merchant.designsystem.resources.error_code_audience_change_not_allowed
import com.fab.wab.merchant.designsystem.resources.error_code_bride_not_allowed
import com.fab.wab.merchant.designsystem.resources.error_code_business_type_mismatch
import com.fab.wab.merchant.designsystem.resources.error_code_gender_mismatch
import com.fab.wab.merchant.designsystem.resources.error_code_too_many_companions
import com.fab.wab.merchant.designsystem.resources.error_code_service_unavailable
import com.fab.wab.merchant.designsystem.resources.error_code_bride_only_service
import com.fab.wab.merchant.designsystem.resources.error_code_staff_not_eligible
import com.fab.wab.merchant.designsystem.resources.error_code_slot_unavailable
import com.fab.wab.merchant.designsystem.resources.error_code_slot_taken
import com.fab.wab.merchant.designsystem.resources.error_code_date_out_of_range
import com.fab.wab.merchant.designsystem.resources.error_code_payment_failed
import com.fab.wab.merchant.designsystem.resources.error_code_payment_not_verified
import com.fab.wab.merchant.designsystem.resources.error_code_payment_option_not_allowed
import com.fab.wab.merchant.designsystem.resources.error_code_draft_expired
import com.fab.wab.merchant.designsystem.resources.error_code_invalid_transition
import com.fab.wab.merchant.designsystem.resources.error_code_cancellation_window_passed
import com.fab.wab.merchant.designsystem.resources.error_code_too_early_to_complete
import com.fab.wab.merchant.designsystem.resources.error_code_already_handled
import com.fab.wab.merchant.designsystem.resources.error_code_schedule_conflict
import com.fab.wab.merchant.designsystem.resources.error_code_owner_required
import com.fab.wab.merchant.designsystem.resources.error_code_last_owner
import com.fab.wab.merchant.designsystem.resources.error_code_upload_invalid
import com.fab.wab.merchant.designsystem.resources.error_code_upload_too_large
import com.fab.wab.merchant.designsystem.resources.error_code_maintenance
import com.fab.wab.merchant.designsystem.resources.error_code_update_required
import com.fab.wab.merchant.designsystem.resources.error_code_current_password_invalid
import com.fab.wab.merchant.designsystem.resources.error_code_email_already_used
import com.fab.wab.merchant.designsystem.resources.error_code_unknown
import com.fab.wab.merchant.designsystem.resources.state_error_message
import com.fab.wab.merchant.designsystem.resources.state_offline_message
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.getString
import org.jetbrains.compose.resources.stringResource

/** One localized string per server error code; `ErrorTextTest` proves the table covers every [ErrorCode]. */
internal val ERROR_CODE_STRINGS: Map<ErrorCode, StringResource> = mapOf(
    ErrorCode.VALIDATION_ERROR to Res.string.error_code_validation_error,
    ErrorCode.UNAUTHORIZED to Res.string.error_code_unauthorized,
    ErrorCode.FORBIDDEN to Res.string.error_code_forbidden,
    ErrorCode.PERMISSION_DENIED to Res.string.error_code_permission_denied,
    ErrorCode.NOT_FOUND to Res.string.error_code_not_found,
    ErrorCode.CONFLICT to Res.string.error_code_conflict,
    ErrorCode.RATE_LIMITED to Res.string.error_code_rate_limited,
    ErrorCode.INTERNAL to Res.string.error_code_internal,
    ErrorCode.OTP_BLOCKED to Res.string.error_code_otp_blocked,
    ErrorCode.OTP_INVALID to Res.string.error_code_otp_invalid,
    ErrorCode.OTP_EXPIRED to Res.string.error_code_otp_expired,
    ErrorCode.OTP_DELIVERY_FAILED to Res.string.error_code_otp_delivery_failed,
    ErrorCode.PHONE_NOT_REGISTERED to Res.string.error_code_phone_not_registered,
    ErrorCode.PHONE_ALREADY_REGISTERED to Res.string.error_code_phone_already_registered,
    ErrorCode.ACCOUNT_BLOCKED to Res.string.error_code_account_blocked,
    ErrorCode.MEMBER_INACTIVE to Res.string.error_code_member_inactive,
    ErrorCode.SALON_NOT_FOUND to Res.string.error_code_salon_not_found,
    ErrorCode.SALON_NOT_BOOKABLE to Res.string.error_code_salon_not_bookable,
    ErrorCode.SALON_CLOSED to Res.string.error_code_salon_closed,
    ErrorCode.BRANCH_NOT_FOUND to Res.string.error_code_branch_not_found,
    ErrorCode.BRANCH_NOT_BOOKABLE to Res.string.error_code_branch_not_bookable,
    ErrorCode.BRANCH_REQUIRED to Res.string.error_code_branch_required,
    ErrorCode.BRANCH_LIMIT_REACHED to Res.string.error_code_branch_limit_reached,
    ErrorCode.BRANCH_HAS_UPCOMING_BOOKINGS to Res.string.error_code_branch_has_upcoming_bookings,
    ErrorCode.LAST_BRANCH to Res.string.error_code_last_branch,
    ErrorCode.BRANCH_SCOPE_DENIED to Res.string.error_code_branch_scope_denied,
    ErrorCode.GENDER_MISMATCH to Res.string.error_code_gender_mismatch,
    ErrorCode.BUSINESS_TYPE_MISMATCH to Res.string.error_code_business_type_mismatch,
    ErrorCode.AUDIENCE_CHANGE_NOT_ALLOWED to Res.string.error_code_audience_change_not_allowed,
    ErrorCode.BRIDE_NOT_ALLOWED to Res.string.error_code_bride_not_allowed,
    ErrorCode.TOO_MANY_COMPANIONS to Res.string.error_code_too_many_companions,
    ErrorCode.SERVICE_UNAVAILABLE to Res.string.error_code_service_unavailable,
    ErrorCode.BRIDE_ONLY_SERVICE to Res.string.error_code_bride_only_service,
    ErrorCode.STAFF_NOT_ELIGIBLE to Res.string.error_code_staff_not_eligible,
    ErrorCode.SLOT_UNAVAILABLE to Res.string.error_code_slot_unavailable,
    ErrorCode.SLOT_TAKEN to Res.string.error_code_slot_taken,
    ErrorCode.DATE_OUT_OF_RANGE to Res.string.error_code_date_out_of_range,
    ErrorCode.PAYMENT_FAILED to Res.string.error_code_payment_failed,
    ErrorCode.PAYMENT_NOT_VERIFIED to Res.string.error_code_payment_not_verified,
    ErrorCode.PAYMENT_OPTION_NOT_ALLOWED to Res.string.error_code_payment_option_not_allowed,
    ErrorCode.DRAFT_EXPIRED to Res.string.error_code_draft_expired,
    ErrorCode.INVALID_TRANSITION to Res.string.error_code_invalid_transition,
    ErrorCode.CANCELLATION_WINDOW_PASSED to Res.string.error_code_cancellation_window_passed,
    ErrorCode.TOO_EARLY_TO_COMPLETE to Res.string.error_code_too_early_to_complete,
    ErrorCode.ALREADY_HANDLED to Res.string.error_code_already_handled,
    ErrorCode.SCHEDULE_CONFLICT to Res.string.error_code_schedule_conflict,
    ErrorCode.OWNER_REQUIRED to Res.string.error_code_owner_required,
    ErrorCode.LAST_OWNER to Res.string.error_code_last_owner,
    ErrorCode.UPLOAD_INVALID to Res.string.error_code_upload_invalid,
    ErrorCode.UPLOAD_TOO_LARGE to Res.string.error_code_upload_too_large,
    ErrorCode.MAINTENANCE to Res.string.error_code_maintenance,
    ErrorCode.UPDATE_REQUIRED to Res.string.error_code_update_required,
    ErrorCode.CURRENT_PASSWORD_INVALID to Res.string.error_code_current_password_invalid,
    ErrorCode.EMAIL_ALREADY_USED to Res.string.error_code_email_already_used,
    ErrorCode.UNKNOWN to Res.string.error_code_unknown,
)

fun errorCodeResource(code: ErrorCode): StringResource = ERROR_CODE_STRINGS[code] ?: ERROR_CODE_STRINGS.getValue(ErrorCode.UNKNOWN)

/**
 * The text a user sees for any [AppError] (CLAUDE.md §3: never raw server text). Server errors use their code's
 * string; connectivity problems the offline text; parse and unknown errors the generic one.
 */
fun errorResource(error: AppError): StringResource = when (error) {
    is AppError.ServerError -> errorCodeResource(error.code)
    is AppError.NetworkError -> Res.string.state_offline_message
    is AppError.HttpError, is AppError.ParseError, is AppError.UnknownError -> Res.string.state_error_message
}

@Composable
fun appErrorMessage(error: AppError): String = stringResource(errorResource(error))

/** For ViewModels (no composition): the same mapping through the suspending resource loader. */
suspend fun appErrorText(error: AppError): String = getString(errorResource(error))

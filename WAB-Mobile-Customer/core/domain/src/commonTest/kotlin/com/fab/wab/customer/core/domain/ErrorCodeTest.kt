package com.fab.wab.customer.core.domain

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ErrorCodeTest {

    @Test
    fun knownCodesParseAndUnknownOnesFallBack() {
        assertEquals(ErrorCode.SLOT_TAKEN, ErrorCode.fromServer("SLOT_TAKEN"))
        assertEquals(ErrorCode.UNKNOWN, ErrorCode.fromServer("NOT_A_CODE"))
        assertEquals(ErrorCode.UNKNOWN, ErrorCode.fromServer(null))
        assertEquals(ErrorCode.UNKNOWN, ErrorCode.fromServer("slot_taken"))
    }

    @Test
    fun everyBusinessDomainCodeIsPresent() {
        val expected = listOf(
            "VALIDATION_ERROR", "UNAUTHORIZED", "FORBIDDEN", "PERMISSION_DENIED", "NOT_FOUND", "CONFLICT", "RATE_LIMITED", "INTERNAL",
            "OTP_BLOCKED", "OTP_INVALID", "OTP_EXPIRED", "PHONE_NOT_REGISTERED", "PHONE_ALREADY_REGISTERED", "ACCOUNT_BLOCKED",
            "MEMBER_INACTIVE", "SALON_NOT_FOUND", "SALON_NOT_BOOKABLE", "SALON_CLOSED", "GENDER_MISMATCH", "TOO_MANY_COMPANIONS",
            "SERVICE_UNAVAILABLE", "BRIDE_ONLY_SERVICE", "STAFF_NOT_ELIGIBLE", "SLOT_UNAVAILABLE", "SLOT_TAKEN", "DATE_OUT_OF_RANGE",
            "PAYMENT_FAILED", "PAYMENT_NOT_VERIFIED", "PAYMENT_OPTION_NOT_ALLOWED", "DRAFT_EXPIRED", "INVALID_TRANSITION",
            "CANCELLATION_WINDOW_PASSED", "TOO_EARLY_TO_COMPLETE", "ALREADY_HANDLED", "SCHEDULE_CONFLICT", "OWNER_REQUIRED", "LAST_OWNER",
            "UPLOAD_INVALID", "UPLOAD_TOO_LARGE", "MAINTENANCE", "UPDATE_REQUIRED", "CURRENT_PASSWORD_INVALID", "EMAIL_ALREADY_USED",
            "BRANCH_NOT_FOUND", "BRANCH_NOT_BOOKABLE", "BRANCH_REQUIRED", "BRANCH_LIMIT_REACHED", "BRANCH_HAS_UPCOMING_BOOKINGS",
            "LAST_BRANCH", "BRANCH_SCOPE_DENIED",
        )
        val names = ErrorCode.entries.map { it.name }
        expected.forEach { assertTrue(it in names, "missing $it") }
        assertEquals(expected.size + 1, ErrorCode.entries.size)
    }
}

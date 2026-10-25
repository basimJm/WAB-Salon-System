package com.fab.wab.merchant.core.domain.permission

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.ErrorCode
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

private const val FORBIDDEN_STATUS = 403

/** MER-052: only FORBIDDEN / PERMISSION_DENIED count as a permission refusal. */
class PermissionDeniedSignalsTest {
    @Test
    fun onlyThePermissionCodesAreRefusals() {
        assertTrue(AppError.ServerError(ErrorCode.FORBIDDEN, FORBIDDEN_STATUS, null).isPermissionRefusal())
        assertTrue(AppError.ServerError(ErrorCode.PERMISSION_DENIED, FORBIDDEN_STATUS, null).isPermissionRefusal())
        assertFalse(AppError.ServerError(ErrorCode.ALREADY_HANDLED, FORBIDDEN_STATUS, null).isPermissionRefusal())
        assertFalse(AppError.HttpError(FORBIDDEN_STATUS, null).isPermissionRefusal())
        assertFalse(AppError.NetworkError("offline").isPermissionRefusal())
    }
}

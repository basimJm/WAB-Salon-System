package com.fab.wab.merchant.feature.branches.presentation

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.feature.branches.presentation.controller.error.branchErrorResource
import com.fab.wab.merchant.feature.branches.presentation.resources.Res
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_error_invalid_status
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** MER-068 (contract 1.4.0, SRV-151): branch status refusals keep `INVALID_TRANSITION`; the branch screens word it for branches. */
class BranchErrorTextTest {

    @Test
    fun invalidTransitionReadsAsABranchStatusRefusal() {
        val closeMain = AppError.ServerError(ErrorCode.INVALID_TRANSITION, 422, "The main branch cannot be closed.")
        assertEquals(Res.string.branch_error_invalid_status, branchErrorResource(closeMain))
    }

    @Test
    fun otherErrorsKeepTheSharedCodeTable() {
        assertNull(branchErrorResource(AppError.ServerError(ErrorCode.LAST_BRANCH, 422, null)))
        assertNull(branchErrorResource(AppError.ServerError(ErrorCode.BRANCH_HAS_UPCOMING_BOOKINGS, 409, null)))
        assertNull(branchErrorResource(AppError.NetworkError("offline")))
    }
}

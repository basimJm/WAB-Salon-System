package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.contract.generated.Operation
import com.fab.wab.merchant.core.data.contract.pathWith

private const val BRANCH_ID = "branchId"

/**
 * MER-064: the per-branch twin of a salon-level operation. `branchId` null = the salon-level path (the member's own
 * branch, or the main branch for the owner); otherwise `/branches/{branchId}/…` with the same body and answer.
 */
internal fun branchPath(salon: Operation, branch: Operation, branchId: String?, vararg params: Pair<String, String>): String =
    if (branchId == null) {
        if (params.isEmpty()) salon.path else salon.pathWith(*params)
    } else {
        branch.pathWith(BRANCH_ID to branchId, *params)
    }

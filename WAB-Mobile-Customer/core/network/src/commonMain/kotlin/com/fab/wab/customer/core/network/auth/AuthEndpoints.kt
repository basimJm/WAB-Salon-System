package com.fab.wab.customer.core.network.auth

/**
 * Paths of the auth API. ASSUMPTION until `contracts/` (INT-01) and server task SRV-026 define them:
 * the customer namespace of CLAUDE.md §4.1 with a `refresh` action.
 */
internal object AuthEndpoints {
    const val REFRESH = "/customer/v1/auth/refresh"
}

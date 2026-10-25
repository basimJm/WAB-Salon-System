package com.fab.wab.merchant.core.network.auth

import kotlin.test.Test
import kotlin.test.assertEquals

/** MER-005: the refresh call uses the merchant token scope (`openapi.merchant.json` `POST /merchant/v1/auth/refresh`). */
class AuthEndpointsTest {
    @Test
    fun refreshUsesTheMerchantNamespace() {
        assertEquals("/merchant/v1/auth/refresh", AuthEndpoints.REFRESH)
    }
}

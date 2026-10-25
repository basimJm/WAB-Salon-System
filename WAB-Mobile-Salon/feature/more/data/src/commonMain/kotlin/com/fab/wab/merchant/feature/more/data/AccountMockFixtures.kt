package com.fab.wab.merchant.feature.more.data

import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.Operation
import com.fab.wab.merchant.core.data.mock.MockFixture

/** Koin names of the mock account answers (dev builds with `DATA_SOURCE=mock`). */
const val MOCK_ME_FIXTURE = "mockMe"
const val MOCK_ME_UPDATE_FIXTURE = "mockMeUpdate"
const val MOCK_CHANGE_PHONE_FIXTURE = "mockChangePhone"

/**
 * The generated fixture of `/me` is `data: null` (the schema is an `allOf`), so the account answers here. The role
 * follows the dev member preset (`MockScenarios.member` patches `role`); the owner has no branch.
 */
private const val ME_JSON =
    """{"success":true,"message":"","data":{"id":"id-1","salonId":"id-1","firstName":"__TEXT__","lastName":"__TEXT__",""" +
        """"phone":"+962791234567","role":"OWNER","permissions":[],"providesServices":true,"branchId":null,""" +
        """"photoUrl":null,"pushEnabled":true}}"""

private fun fixture(operation: Operation) = MockFixture(operation.method.name, operation.path, ME_JSON)

val mockMeFixture = fixture(MerchantOperations.getMe)
val mockMeUpdateFixture = fixture(MerchantOperations.patchMe)
val mockChangePhoneFixture = fixture(MerchantOperations.postAuthChangePhone)

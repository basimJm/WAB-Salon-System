package com.fab.wab.merchant.core.data.mock

import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations

/** Mock `GET /customers/lookup` (BUSINESS_DOMAIN §5.20): this national number is a registered WAB customer. */
const val MOCK_REGISTERED_NUMBER = "791234567"

/** The query name of the number in `GET /customers/lookup` (contract). */
const val LOOKUP_NUMBER_PARAM = "number"

private const val MOCK_REGISTERED_NAME = "Rana"
private const val MOCK_REGISTERED_GENDER = "FEMALE"
private val LOOKUP_PATH = MerchantOperations.getCustomersLookup.path

/**
 * The lookup answer of the mock transport: [MOCK_REGISTERED_NUMBER] is registered (first name + gender), every other
 * number is unknown (`registered: false`, no name, no gender). Other paths keep [json].
 */
fun patchCustomerLookup(json: String, path: String, number: String?): String {
    if (!path.endsWith(LOOKUP_PATH)) return json
    return if (number == MOCK_REGISTERED_NUMBER) {
        """{"success":true,"message":"","data":{"registered":true,"firstName":"$MOCK_REGISTERED_NAME","gender":"$MOCK_REGISTERED_GENDER"}}"""
    } else {
        """{"success":true,"message":"","data":{"registered":false,"firstName":null,"gender":null}}"""
    }
}

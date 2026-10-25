package com.fab.wab.merchant.core.data.mock

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.MockFixtures
import com.fab.wab.merchant.core.network.client.NetworkJson
import kotlinx.serialization.KSerializer

/**
 * The fixture of [operationId] decoded exactly as the app decodes that response (`NetworkJson`, `BaseResponse`).
 * Captured operations (`MockFixtures.captured`) are real dev-API / local-stack responses, so feature mapper tests run
 * on the real shapes (MER-054).
 */
fun <T> decodeFixture(operationId: String, data: KSerializer<T>, language: String? = null): BaseResponse<T> =
    NetworkJson.json.decodeFromString(
        BaseResponse.serializer(data),
        localizeFixture(MockFixtures.byOperationId.getValue(operationId), language),
    )

package com.fab.wab.merchant.core.data.contract

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.ContractDecoders
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.MockFixtures
import com.fab.wab.merchant.core.data.mock.fixtureKeyOf
import com.fab.wab.merchant.core.data.mock.localizeFixture
import com.fab.wab.merchant.core.network.client.NetworkJson
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.fail

/**
 * MER-054: every fixture (real responses captured from the dev API / local stack, schema samples otherwise) decodes
 * with the generated DTOs and the app's JSON settings, so a server shape change fails here before a screen breaks.
 */
class ContractFixturesTest {

    private val json = NetworkJson.json

    @Test
    fun everyFixtureDecodesWithTheGeneratedDtos() {
        assertEquals(MockFixtures.byOperationId.keys, ContractDecoders.byOperationId.keys)
        MockFixtures.byOperationId.forEach { (operation, fixture) ->
            val decoder = ContractDecoders.byOperationId.getValue(operation)
            val envelope = runCatching {
                json.decodeFromString(BaseResponse.serializer(JsonElement.serializer()), localizeFixture(fixture, LANGUAGE))
            }.getOrElse { fail("$operation: envelope does not decode: ${it.message}") }
            assertTrue(envelope.success, operation)
            runCatching { json.decodeFromJsonElement(decoder, envelope.data) }
                .onFailure { fail("$operation: data does not decode with the generated DTO: ${it.message}") }
        }
    }

    @Test
    fun everyOperationTheAppCallsHasARealCapturedResponse() {
        val notCaptured = AppOperations.all.map(::fixtureKeyOf).filterNot { it in MockFixtures.captured }.toSet()
        assertEquals(AppOperations.notCapturable.map(::fixtureKeyOf).toSet(), notCaptured)
    }

    @Test
    fun theAppDecodesSharedShapesWithTheTypeItUses() {
        // Branch-level calls go through `branchPath` with the salon-level DTO; branch actions read the branch DTO.
        AppOperations.decodedAs.forEach { (operation, decoder) ->
            val key = fixtureKeyOf(operation)
            assertTrue(key in MockFixtures.captured, "$key: no captured response")
            val envelope = json.decodeFromString(
                BaseResponse.serializer(JsonElement.serializer()),
                MockFixtures.byOperationId.getValue(key),
            )
            runCatching { json.decodeFromJsonElement(decoder, envelope.data) }
                .onFailure { fail("$key: does not decode with the type the app uses: ${it.message}") }
        }
    }

    @Test
    fun paginatedRealResponsesCarryMeta() {
        listOf(
            MerchantOperations.getBookings,
            MerchantOperations.getNotifications,
            MerchantOperations.getTeamMembers,
            MerchantOperations.getFinanceTransactions,
            MerchantOperations.getCatalogServices,
        ).map(::fixtureKeyOf).forEach { operation ->
            val envelope = json.decodeFromString(
                BaseResponse.serializer(JsonElement.serializer()),
                MockFixtures.byOperationId.getValue(operation),
            )
            val meta = envelope.meta ?: fail("$operation: no pagination meta")
            assertTrue(meta.pageSize > 0 && meta.page >= 1, operation)
            assertTrue(envelope.data != JsonNull, operation)
        }
    }

    private companion object {
        const val LANGUAGE = "en"
    }
}

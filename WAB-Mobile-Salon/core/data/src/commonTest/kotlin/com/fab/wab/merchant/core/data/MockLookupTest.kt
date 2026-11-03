package com.fab.wab.merchant.core.data

import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.mock.MOCK_REGISTERED_NUMBER
import com.fab.wab.merchant.core.data.mock.MockScenarios
import com.fab.wab.merchant.core.data.mock.contractFixtures
import com.fab.wab.merchant.core.data.mock.createMockEngine
import com.fab.wab.merchant.core.data.mock.patchCustomerLookup
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.test.runTest
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

private const val OTHER = """{"success":true,"message":"","data":{}}"""

/** MER-085: the new booking endpoints answer in mock mode; one fixed number is a registered customer. */
class MockLookupTest {
    private val client = HttpClient(createMockEngine(requestTimeoutMs = 10, fixtures = contractFixtures()))

    @AfterTest
    fun reset() = MockScenarios.reset()

    @Test
    fun fixedNumberIsRegisteredOthersAreNot() {
        val path = MerchantOperations.getCustomersLookup.path
        assertTrue(patchCustomerLookup(OTHER, path, MOCK_REGISTERED_NUMBER).contains("\"registered\":true"))
        assertTrue(patchCustomerLookup(OTHER, path, "790000000").contains("\"registered\":false"))
        assertEquals(OTHER, patchCustomerLookup(OTHER, "/merchant/v1/bookings", MOCK_REGISTERED_NUMBER))
    }

    @Test
    fun lookupAndCreateAnswerThroughTheTransport() = runTest {
        val lookup = client.get(MerchantOperations.getCustomersLookup.path) { parameter("number", MOCK_REGISTERED_NUMBER) }
        assertEquals(HttpStatusCode.OK, lookup.status)
        assertTrue(lookup.bodyAsText().contains("\"registered\":true"))
        val created = client.post(MerchantOperations.postBookings.path)
        assertEquals(HttpStatusCode.OK, created.status)
        assertTrue(created.bodyAsText().contains("\"id\""))
    }
}

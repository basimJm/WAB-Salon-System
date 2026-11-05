package com.fab.wab.customer.core.data

import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.MockFixtures
import com.fab.wab.customer.core.data.mock.MockScenario
import com.fab.wab.customer.core.data.mock.MockScenarios
import com.fab.wab.customer.core.data.mock.createMockEngine
import com.fab.wab.customer.core.data.mock.fixtureKeyOf
import com.fab.wab.customer.core.data.mock.localizeFixture
import com.fab.wab.customer.core.data.mock.matchOperation
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.test.runTest
import kotlinx.io.IOException
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

private const val TIMEOUT_MS = 50L

class MockTransportTest {

    private val client = HttpClient(createMockEngine(requestTimeoutMs = TIMEOUT_MS)) { expectSuccess = false }

    @AfterTest
    fun reset() = MockScenarios.set(MockScenario.Success)

    @Test
    fun matchesPathTemplatesWithParameters() {
        assertEquals(CustomerOperations.getSalonsBySalonId, matchOperation("GET", "/customer/v1/salons/s1"))
        assertEquals(CustomerOperations.getHome, matchOperation("get", "/customer/v1/home"))
        assertNull(matchOperation("GET", "/customer/v1/salons/s1/extra"))
        assertNull(matchOperation("DELETE", "/customer/v1/home"))
    }

    @Test
    fun everyOperationHasAFixtureKey() {
        CustomerOperations.all.forEach { op ->
            assertNotNull(MockFixtures.byOperationId[fixtureKeyOf(op)], "no fixture for ${op.method} ${op.path}")
        }
        assertEquals(CustomerOperations.all.size, MockFixtures.byOperationId.size)
    }

    @Test
    fun fixturesAreLocalizedByAcceptLanguage() = runTest {
        assertEquals("نص تجريبي", localizeFixture(MockFixtures.TEXT_MARKER, "ar"))
        assertEquals("Sample text", localizeFixture(MockFixtures.TEXT_MARKER, "en"))
        val response = client.get("https://mock/customer/v1/home") { header(HttpHeaders.AcceptLanguage, "ar") }
        assertEquals(HttpStatusCode.OK, response.status)
        assertTrue(response.bodyAsText().contains("\"success\": true"))
    }

    @Test
    fun scenariosAnswerTheBackendEnvelope() = runTest {
        MockScenarios.set(MockScenario.ServerError)
        val error = client.get("https://mock/customer/v1/home")
        assertEquals(HttpStatusCode.InternalServerError, error.status)
        assertTrue(error.bodyAsText().contains("\"code\":\"INTERNAL\""))
        MockScenarios.set(MockScenario.Unauthorized)
        assertEquals(HttpStatusCode.Unauthorized, client.get("https://mock/customer/v1/home").status)
        MockScenarios.set(MockScenario.Empty)
        assertTrue(client.get("https://mock/customer/v1/salons").bodyAsText().contains("\"data\": []"))
        MockScenarios.set(MockScenario.Offline)
        assertFailsWith<IOException> { client.get("https://mock/customer/v1/home") }
    }

    @Test
    fun openNowFiltersTheSalonsFixtureLikeTheServer() = runTest {
        val everyone = client.get("https://mock/customer/v1/salons")
        assertTrue(everyone.bodyAsText().contains("\"id\""), "the plain fixture keeps every salon")
        val response = client.get("https://mock/customer/v1/salons?openNow=true")
        val body = response.bodyAsText()
        assertTrue(body.contains("\"isOpenNow\": true") || body.contains("\"isOpenNow\":true"))
        assertTrue(!body.contains("\"isOpenNow\": false") && !body.contains("\"isOpenNow\":false"), "CUS-110: dev mock honours openNow (§5.17)")
    }

    @Test
    fun unknownPathsAnswerNotFoundEnvelope() = runTest {
        val response = client.get("https://mock/customer/v1/not-in-contract")
        assertEquals(HttpStatusCode.NotFound, response.status)
        assertTrue(response.bodyAsText().contains("NOT_FOUND"))
    }
}

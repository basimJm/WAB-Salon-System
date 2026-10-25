package com.fab.wab.merchant.core.data

import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.mock.MockFixture
import com.fab.wab.merchant.core.data.mock.MockPresets
import com.fab.wab.merchant.core.data.mock.MockSalonState
import com.fab.wab.merchant.core.data.mock.MockScenarios
import com.fab.wab.merchant.core.data.mock.contractFixtures
import com.fab.wab.merchant.core.data.mock.createMockEngine
import com.fab.wab.merchant.core.data.mock.fixtureKeyOf
import com.fab.wab.merchant.core.data.mock.patchFixture
import com.fab.wab.merchant.core.data.mock.patchPendingBooking
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlinx.coroutines.test.runTest

private const val SALON = """{"success":true,"data":{"state":"LIVE","booking":{"state":"PENDING"}}}"""
private const val LOGIN = """{"success":true,"data":{"member":{"role":"OWNER","permissions":["DASHBOARD_VIEW"]}}}"""

/** MER-007: every contract operation answers in mock mode; salon states and permission sets are switchable. */
class MockWorldTest {
    @AfterTest
    fun reset() = MockScenarios.reset()

    @Test
    fun everyContractOperationHasAFixture() {
        val fixtures = contractFixtures()
        assertEquals(MerchantOperations.all.size, fixtures.size)
        assertEquals("GetBookingsById", fixtureKeyOf(MerchantOperations.getBookingsById))
    }

    @Test
    fun salonStateOverrideChangesOnlySalonStates() {
        val patched = patchFixture(SALON, MockSalonState.APPLICATION_REJECTED, null)
        assertTrue(patched.contains("\"state\":\"APPLICATION_REJECTED\""))
        assertTrue(patched.contains("\"state\":\"PENDING\""), "a booking state is not a salon state")
    }

    @Test
    fun memberOverrideReplacesRoleAndPermissions() {
        val patched = patchFixture(LOGIN, null, MockPresets.employee)
        assertTrue(patched.contains("\"role\":\"EMPLOYEE\""))
        assertTrue(patched.contains("\"permissions\":[\"BOOKINGS_OPERATE\",\"BOOKINGS_VIEW_OWN\"]"))
        assertEquals(LOGIN, patchFixture(LOGIN, null, null))
        assertEquals("not json", patchFixture("not json", MockSalonState.LIVE, null))
    }

    @Test
    fun ownerPresetHasEveryGrantableKey() {
        assertEquals(15, MockPresets.ALL_PERMISSIONS.size)
        assertEquals(MockPresets.ALL_PERMISSIONS, MockPresets.owner.permissions)
    }

    @Test
    fun engineServesTheOverriddenWorldAndFeatureFixturesWin() = runTest {
        val feature = MockFixture("GET", MerchantOperations.getSalon.path, SALON)
        val client = HttpClient(createMockEngine(requestTimeoutMs = 10, fixtures = listOf(feature) + contractFixtures()))
        MockScenarios.setSalonState(MockSalonState.OFFLINE)
        val body = client.get("https://mock" + MerchantOperations.getSalon.path).bodyAsText()
        assertTrue(body.contains("\"state\":\"OFFLINE\""))
        assertTrue(body.contains("\"booking\""), "the hand-written feature fixture wins over the generated one")
    }

    @Test
    fun aBookingMarkedPendingAnswersAsPendingOthersStayAsTheFixtureSays() {
        val fixture = """{"success":true,"data":{"id":"b1","status":"APPROVED"}}"""
        assertEquals(fixture, patchPendingBooking(fixture, "/merchant/v1/bookings/b1", emptySet()))
        val pending = patchPendingBooking(fixture, "/merchant/v1/bookings/b1", setOf("b1"))
        assertTrue(pending.contains("\"status\":\"PENDING\""))
        assertEquals(fixture, patchPendingBooking(fixture, "/merchant/v1/bookings/b2", setOf("b1")))
        assertEquals(fixture, patchPendingBooking(fixture, "/merchant/v1/bookings/b1/approve", setOf("b1")))
    }
}

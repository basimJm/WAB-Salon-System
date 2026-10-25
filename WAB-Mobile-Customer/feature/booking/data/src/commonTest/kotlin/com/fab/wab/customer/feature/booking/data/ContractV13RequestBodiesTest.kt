package com.fab.wab.customer.feature.booking.data

import com.fab.wab.customer.core.data.contract.generated.PostBookingsDraftsBody
import com.fab.wab.customer.core.data.contract.generated.PostBookingsDraftsData
import com.fab.wab.customer.core.data.contract.generated.PostSalonsBySalonIdAvailabilityBody
import com.fab.wab.customer.core.data.mock.decodeFixture
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.core.network.client.NetworkJson
import com.fab.wab.customer.feature.booking.data.remote.BookingDraftApi
import com.fab.wab.customer.feature.booking.data.repository.BookingDraftRepositoryImpl
import com.fab.wab.customer.feature.booking.data.repository.availabilityBodyOf
import com.fab.wab.customer.feature.booking.data.repository.draftBodyOf
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.model.StaffChoice
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * CUS-088: contract 1.3.0 (SRV-151) makes availability `others[].start/end` and draft `persons[].start` required ISO
 * date-times and pins ids to `^[a-fA-F0-9]{24}$`. The request builders must always send the times; the ids the app
 * echoes back come from the server and must satisfy the pattern.
 */
class ContractV13RequestBodiesTest {
    private val me = DraftPerson(name = " Sara ", serviceIds = listOf(SERVICE_ID), start = START, end = END)
    private val companion = DraftPerson(
        name = "Lina", serviceIds = listOf(SERVICE_ID), start = START, end = END, staff = StaffChoice.Specific(STAFF_ID, "Noor"),
    )

    @Test
    fun draftBodySendsEveryPersonsStartOnTheWire() {
        val body = assertNotNull(draftBodyOf(SALON_ID, PaymentMethod.PAY_ON_ARRIVAL, listOf(me, companion)))
        val persons = NetworkJson.json.encodeToJsonElement(PostBookingsDraftsBody.serializer(), body)
            .jsonObject.getValue("persons").jsonArray
        assertEquals(listOf(START, START), persons.map { it.jsonObject.getValue("start").jsonPrimitive.content })
        assertEquals("Sara", body.persons.first().name)
        assertEquals(STAFF_ID, body.persons.last().staffId)
    }

    @Test
    fun draftBodyIsNotBuiltWhileAPersonHasNoSlot() {
        assertNull(draftBodyOf(SALON_ID, PaymentMethod.PAY_ON_ARRIVAL, listOf(me, companion.copy(start = null, end = null))))
        assertNull(draftBodyOf(SALON_ID, PaymentMethod.PAY_ON_ARRIVAL, listOf(me.copy(start = null))))
    }

    @Test
    fun repositoryNeverSendsAnIncompleteDraft() = runTest {
        var requests = 0
        val client = HttpClient(MockEngine { requests++; respond("") })
        val result = BookingDraftRepositoryImpl(BookingDraftApi(client))
            .create(SALON_ID, branchId = null, PaymentMethod.PAY_ON_ARRIVAL, listOf(me, companion.copy(start = null)))
        assertIs<AppError.UnknownError>(assertIs<AppResult.Error>(result).appError)
        assertEquals(0, requests)
    }

    @Test
    fun availabilityOthersCarryStartAndEndOnTheWire() {
        val body = availabilityBodyOf(DATE, me, listOf(companion, companion.copy(end = null)), draftId = null)
        val others = NetworkJson.json.encodeToJsonElement(PostSalonsBySalonIdAvailabilityBody.serializer(), body)
            .jsonObject.getValue("others").jsonArray
        assertEquals(1, others.size, "a pick without an end is not sent (the server requires both)")
        val other = others.single().jsonObject
        assertEquals(START, other.getValue("start").jsonPrimitive.content)
        assertEquals(END, other.getValue("end").jsonPrimitive.content)
    }

    @Test
    fun realIdsTheAppEchoesBackMatchTheObjectIdPattern() {
        val draft = decodeFixture("PostBookingsDrafts", PostBookingsDraftsData.serializer()).data
        val ids = listOfNotNull(draft.id, draft.salon.id, draft.branch?.id)
        assertTrue(ids.size >= 2)
        ids.forEach { assertTrue(OBJECT_ID.matches(it), "id $it must match the 1.3.0 pattern") }
        listOf(SALON_ID, STAFF_ID, SERVICE_ID).forEach { assertTrue(OBJECT_ID.matches(it)) }
    }

    private companion object {
        val OBJECT_ID = Regex("^[a-fA-F0-9]{24}$")
        const val SALON_ID = "65f1c0ffee0000000000a001"
        const val STAFF_ID = "65f1c0ffee0000000000b001"
        const val SERVICE_ID = "65F1C0FFEE0000000000C001"
        const val DATE = "2026-10-29"
        const val START = "2026-10-29T08:00:00.000Z"
        const val END = "2026-10-29T09:00:00.000Z"
    }
}

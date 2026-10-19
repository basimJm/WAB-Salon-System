package com.fab.wab.customer.feature.bookings.data

import com.fab.wab.customer.core.data.contract.generated.GetBookingsDataItem
import com.fab.wab.customer.core.data.contract.generated.GetBookingsDataItemSalon
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.core.domain.booking.PaymentStatus
import com.fab.wab.customer.feature.bookings.data.remote.BookingsApi
import com.fab.wab.customer.feature.bookings.data.repository.toDomain
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.Url
import io.ktor.http.headersOf
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class BookingsApiTest {

    private var requested: Url? = null
    private val client = HttpClient(
        MockEngine { request ->
            requested = request.url
            respond(
                """{"success":true,"message":"","data":[]}""",
                headers = headersOf(HttpHeaders.ContentType, ContentType.Application.Json.toString()),
            )
        },
    ) { install(ContentNegotiation) { json() } }

    @Test
    fun sendsTabQueryAndPaging() = runTest {
        BookingsApi(client).list("PAST", "glow", 2, 10)
        val p = requested!!.parameters
        assertEquals("PAST", p["tab"])
        assertEquals("glow", p["q"])
        assertEquals("2", p["page"])
        BookingsApi(client).list("UPCOMING", " ", 1, 10)
        assertNull(requested!!.parameters["q"])
    }

    @Test
    fun mapsStatusesWithUnknownFallback() {
        val item = GetBookingsDataItem(
            id = "b1", referenceNumber = "WAB-1", status = "approved", paymentMethod = "DEPOSIT", paymentStatus = "status",
            hasBride = false, appointmentStart = "2026-10-18T10:00:00Z", appointmentEnd = "2026-10-18T11:00:00Z",
            respondBy = "2026-10-18T09:00:00Z", personsCount = 2.0, total = "30", salon = GetBookingsDataItemSalon("s1", "Glow"),
            customer = null, staff = emptyList(),
        ).toDomain()
        assertEquals(BookingStatus.APPROVED, item.status)
        assertEquals(PaymentStatus.UNKNOWN, item.paymentStatus)
        assertEquals("Glow", item.salonName)
        assertEquals(2, item.personsCount)
    }
}

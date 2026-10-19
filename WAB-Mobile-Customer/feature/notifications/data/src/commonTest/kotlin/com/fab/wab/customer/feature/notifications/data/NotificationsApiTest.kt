package com.fab.wab.customer.feature.notifications.data

import com.fab.wab.customer.core.data.contract.generated.GetNotificationsDataItem
import com.fab.wab.customer.core.data.contract.generated.GetNotificationsDataItemData
import com.fab.wab.customer.feature.notifications.data.remote.NotificationsApi
import com.fab.wab.customer.feature.notifications.data.repository.toDomain
import com.fab.wab.customer.feature.notifications.domain.model.NotificationFilters
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.toByteArray
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
import kotlin.test.assertTrue

class NotificationsApiTest {

    private var requested: Url? = null
    private var sentBody: String? = null
    private val client = HttpClient(
        MockEngine { request ->
            requested = request.url
            sentBody = request.body.toByteArray().decodeToString()
            respond(
                """{"success":true,"message":"","data":{"marked":1,"unread":2}}""",
                headers = headersOf(HttpHeaders.ContentType, ContentType.Application.Json.toString()),
            )
        },
    ) { install(ContentNegotiation) { json() } }

    @Test
    fun listSendsOnlyActiveFilters() = runTest {
        runCatching { NotificationsApi(client).list(NotificationFilters(from = "2026-10-01", query = "glow"), 2, 10) }
        val p = requested!!.parameters
        assertEquals("2026-10-01", p["from"])
        assertNull(p["to"])
        assertEquals("glow", p["q"])
        assertEquals("2", p["page"])
        runCatching { NotificationsApi(client).list(NotificationFilters(query = "  "), 1, 10) }
        assertNull(requested!!.parameters["q"])
    }

    @Test
    fun markReadPostsIdsAndReturnsTheRemainingUnread() = runTest {
        val response = NotificationsApi(client).markRead(listOf("n1", "n2"))
        assertTrue(requested!!.encodedPath.endsWith("/notifications/read"))
        assertTrue(sentBody!!.contains("\"n1\""))
        assertEquals(2, response.data.unread)
    }

    @Test
    fun mapsTheBookingLink() {
        val item = GetNotificationsDataItem(
            id = "n1", type = "BOOKING", event = "booking.approved", title = "t", body = "b",
            data = GetNotificationsDataItemData(bookingId = "b1"), isRead = false, createdAt = "2026-10-19T10:00:00Z",
        ).toDomain()
        assertEquals("b1", item.bookingId)
        assertNull(item.salonId)
    }
}

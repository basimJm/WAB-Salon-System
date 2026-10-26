package com.fab.wab.merchant.feature.bookings.data

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.feature.bookings.data.remote.BookingsApi
import com.fab.wab.merchant.feature.bookings.data.repository.BookingsRepositoryImpl
import com.fab.wab.merchant.feature.bookings.domain.model.StaffRef
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.headersOf
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

/** MER-075 e2e: the staff filter / calendar / reassignment list missed providers after the server's first page. */
class BookingsRepositoryStaffTest {

    private val pages = mutableListOf<Map<String, String?>>()

    private fun member(index: Int, provides: Boolean = true) =
        """{"id":"m$index","firstName":"F$index","lastName":"L$index","phone":"+962790000000","photoUrl":null,""" +
            """"role":"EMPLOYEE","permissions":[],"active":true,"providesServices":$provides}"""

    private fun client(total: Int) = HttpClient(
        MockEngine { request ->
            val page = request.url.parameters["page"]?.toInt() ?: 1
            val size = request.url.parameters["pageSize"]?.toInt() ?: DEFAULT_SERVER_PAGE
            pages += mapOf("page" to request.url.parameters["page"], "pageSize" to request.url.parameters["pageSize"])
            val rows = (0 until total).drop((page - 1) * size).take(size).map { member(it, provides = it != 0) }
            respond(
                """{"success":true,"message":"","data":[${rows.joinToString(",")}]}""",
                headers = headersOf(HttpHeaders.ContentType, ContentType.Application.Json.toString()),
            )
        },
    ) { install(ContentNegotiation) { json() } }

    @Test
    fun everyPageIsReadAndOnlyActiveProvidersAreKept() = runTest {
        val result = BookingsRepositoryImpl(BookingsApi(client(total = 150))).staff()
        val staff = assertIs<AppResult.Success<List<StaffRef>>>(result).data
        assertEquals(149, staff.size, "150 members on two pages, the owner-like m0 provides no services")
        assertEquals(listOf("1", "2"), pages.map { it["page"] })
        assertEquals("100", pages.first()["pageSize"])
    }

    @Test
    fun aShortFirstPageStopsAfterOneRequest() = runTest {
        val result = BookingsRepositoryImpl(BookingsApi(client(total = 12))).staff()
        assertEquals(11, (result as AppResult.Success).data.size)
        assertEquals(1, pages.size)
    }

    private companion object {
        const val DEFAULT_SERVER_PAGE = 10
    }
}

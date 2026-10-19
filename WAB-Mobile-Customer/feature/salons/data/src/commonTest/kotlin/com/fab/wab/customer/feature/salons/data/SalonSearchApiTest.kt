package com.fab.wab.customer.feature.salons.data

import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.PriceRange
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.salon.SalonQuery
import com.fab.wab.customer.core.domain.salon.ServiceRef
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.salons.data.remote.SalonSearchApi
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

class SalonSearchApiTest {

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
    fun combinesTextFiltersAndLocationInOneQuery() = runTest {
        val query = SalonQuery(
            gender = Gender.FEMALE,
            text = "glow",
            filters = SalonFilters(
                services = listOf(ServiceRef("s1", "Hair"), ServiceRef("s2", "Nails")),
                priceRange = PriceRange("10", "15"),
                general = GeneralFilter.NEAREST,
                minRating = 3,
            ),
            location = LocationData(31.9, 35.9),
            page = 2,
        )
        SalonSearchApi(client).search(query)
        val p = requested!!.parameters
        assertEquals("FEMALE", p["gender"])
        assertEquals("glow", p["q"])
        assertEquals(listOf("s1", "s2"), p.getAll("serviceIds"))
        assertEquals("10", p["minPrice"])
        assertEquals("3", p["minRating"])
        assertEquals("NEAREST", p["sort"])
        assertNull(p["general"])
        assertEquals("31.9", p["lat"])
        assertEquals("2", p["page"])
    }

    @Test
    fun recommendedUsesTheGeneralParamAndBlankTextIsOmitted() = runTest {
        SalonSearchApi(client).search(SalonQuery(Gender.MALE, text = " ", filters = SalonFilters(general = GeneralFilter.RECOMMENDED)))
        val p = requested!!.parameters
        assertEquals("RECOMMENDED", p["general"])
        assertNull(p["q"])
        assertNull(p["sort"])
    }
}

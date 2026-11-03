package com.fab.wab.customer.feature.salons.data

import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.PriceRange
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.salon.SalonQuery
import com.fab.wab.customer.core.domain.salon.ServiceRef
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.salons.data.remote.SalonFiltersApi
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

/** CUS-103 (BUSINESS_DOMAIN §5.22): filters → query of `GET /salons`, `/salons/filters`, `/salons/suggestions`. */
class SalonSearchApiTest {

    private var requested: Url? = null
    private var body = """{"success":true,"message":"","data":[]}"""
    private val client = HttpClient(
        MockEngine { request ->
            requested = request.url
            respond(body, headers = headersOf(HttpHeaders.ContentType, ContentType.Application.Json.toString()))
        },
    ) { install(ContentNegotiation) { json() } }

    @Test
    fun combinesTextFiltersAndLocationInOneQuery() = runTest {
        val query = SalonQuery(
            text = " glow ",
            filters = SalonFilters(
                services = listOf(ServiceRef("s1", "Hair"), ServiceRef("s2", "Nails")),
                priceRange = PriceRange("10", "15"),
                general = GeneralFilter.NEAREST,
                minRating = 3,
                businessTypes = setOf(BusinessType.TATTOO, BusinessType.CLINIC),
                gender = Gender.FEMALE,
            ),
            location = LocationData(31.9, 35.9),
            page = 2,
        )
        SalonSearchApi(client).search(query)
        val p = requested!!.parameters
        assertEquals("FEMALE", p["gender"])
        assertEquals("CLINIC,TATTOO", p["businessType"], "several types in one comma list, contract order")
        assertEquals("glow", p["q"])
        assertEquals(listOf("s1", "s2"), p.getAll("serviceIds"))
        assertEquals("10", p["minPrice"])
        assertEquals("15", p["maxPrice"])
        assertEquals("3", p["minRating"])
        assertEquals("NEAREST", p["sort"])
        assertNull(p["general"])
        assertEquals("31.9", p["lat"])
        assertEquals("2", p["page"])
    }

    @Test
    fun noGenderNoTypeAndBlankTextAreOmitted() = runTest {
        SalonSearchApi(client).search(SalonQuery(text = " ", filters = SalonFilters(general = GeneralFilter.RECOMMENDED)))
        val p = requested!!.parameters
        assertEquals("RECOMMENDED", p["general"])
        assertNull(p["q"])
        assertNull(p["sort"])
        assertNull(p["businessType"], "no type = every type")
        assertNull(p["gender"], "discovery has no gender filter unless chosen (§5.22)")
    }

    @Test
    fun priceRangeWorksWithoutServices() = runTest {
        SalonSearchApi(client).search(SalonQuery(filters = SalonFilters(priceRange = PriceRange("5", "40"))))
        val p = requested!!.parameters
        assertEquals("5", p["minPrice"])
        assertEquals("40", p["maxPrice"])
        assertNull(p["serviceIds"])
    }

    @Test
    fun priceBoundsAskForTheScopeAndServicesOnly() = runTest {
        body = """{"success":true,"message":"","data":{"priceRange":null}}"""
        SalonFiltersApi(client).filters(SalonFilters(businessTypes = setOf(BusinessType.SALON), gender = Gender.MALE, minRating = 4))
        val p = requested!!.parameters
        assertEquals("SALON", p["businessType"])
        assertEquals("MALE", p["gender"])
        assertNull(p["serviceIds"])
        assertNull(p["minRating"])
    }

    @Test
    fun suggestionsSendTheTextAndTheScope() = runTest {
        body = """{"success":true,"message":"","data":{"services":[],"places":[]}}"""
        SalonSearchApi(client).suggestions("lase", SalonFilters(businessTypes = setOf(BusinessType.CLINIC)))
        val p = requested!!.parameters
        assertEquals("lase", p["q"])
        assertEquals("CLINIC", p["businessType"])
        assertNull(p["gender"])
    }
}

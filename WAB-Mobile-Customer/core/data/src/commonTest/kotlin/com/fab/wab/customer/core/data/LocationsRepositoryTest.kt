package com.fab.wab.customer.core.data

import com.fab.wab.customer.core.data.locations.LocationsApi
import com.fab.wab.customer.core.data.locations.LocationsRepositoryImpl
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.locations.Country
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

private const val COUNTRIES_AR =
    """{"success":true,"data":[{"code":"JO","name":"الأردن","dialCode":"+962","flagUrl":"","phoneRegex":"^7[789]\\d{7}$"}]}"""
private const val FLAG = "https://cdn.example/jo.png"
private const val COUNTRIES_EN =
    """{"success":true,"data":[{"code":"JO","name":"Jordan","dialCode":"+962","flagUrl":"$FLAG","phoneRegex":"^7$"}]}"""
private const val CITIES = """{"success":true,"data":[{"id":"amman","name":"عمّان"}]}"""
private const val AREAS = """{"success":true,"data":[{"id":"a1","name":"عبدون"}]}"""
private const val ERROR = """{"success":false,"message":"down","error":{"code":"INTERNAL","traceId":"t"}}"""

class LocationsRepositoryTest {

    private val language = MutableStateFlow("ar")
    private var requests = 0
    private var failNext = false

    private val client = HttpClient(
        MockEngine { request ->
            requests += 1
            val json = headersOf(HttpHeaders.ContentType, "application/json")
            if (failNext) {
                failNext = false
                respond(ERROR, HttpStatusCode.InternalServerError, json)
            } else {
                val body = when {
                    request.url.encodedPath.endsWith("/countries") -> if (language.value == "ar") COUNTRIES_AR else COUNTRIES_EN
                    request.url.encodedPath.endsWith("/cities") -> CITIES
                    else -> AREAS
                }
                respond(body, HttpStatusCode.OK, json)
            }
        },
    ) {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
        expectSuccess = true
    }

    private val repository = LocationsRepositoryImpl(LocationsApi(client), language)

    @Test
    fun countriesAreCachedPerLanguage() = runTest {
        val arabic = repository.countries()
        assertIs<AppResult.Success<List<Country>>>(arabic)
        assertEquals("الأردن", arabic.data.single().name)
        assertEquals(null, arabic.data.single().flagUrl)
        repository.countries()
        assertEquals(1, requests)
        language.value = "en"
        val english = repository.countries()
        assertIs<AppResult.Success<List<Country>>>(english)
        assertEquals("Jordan", english.data.single().name)
        assertEquals(2, requests)
        language.value = "ar"
        repository.countries()
        assertEquals(2, requests)
        repository.countries(refresh = true)
        assertEquals(3, requests)
    }

    @Test
    fun citiesAndAreasAreCachedByParentAndErrorsAreNot() = runTest {
        assertEquals("عمّان", (repository.cities("JO") as AppResult.Success).data.single().name)
        repository.cities("JO")
        assertEquals(1, requests)
        repository.cities("SA")
        assertEquals(2, requests)
        failNext = true
        assertIs<AppResult.Error>(repository.areas("amman"))
        assertEquals("عبدون", (repository.areas("amman") as AppResult.Success).data.single().name)
        assertEquals(4, requests)
    }
}

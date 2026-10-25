package com.fab.wab.merchant.feature.content.data

import com.fab.wab.merchant.feature.content.data.remote.ContentApi
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
import kotlin.test.assertTrue

class ContentApiTest {
    private var requested: Url? = null
    private val client = HttpClient(
        MockEngine { request ->
            requested = request.url
            respond(
                """{"success":true,"message":"","data":{"kind":"TERMS","body":"<p>Hi</p>"}}""",
                headers = headersOf(HttpHeaders.ContentType, ContentType.Application.Json.toString()),
            )
        },
    ) { install(ContentNegotiation) { json() } }

    @Test
    fun pageUsesTheSlugPathAndMapsTheBody() = runTest {
        val page = ContentApi(client).page("terms")
        assertTrue(requested!!.encodedPath.endsWith("/content/pages/terms"))
        assertEquals("<p>Hi</p>", page.data.body)
    }
}

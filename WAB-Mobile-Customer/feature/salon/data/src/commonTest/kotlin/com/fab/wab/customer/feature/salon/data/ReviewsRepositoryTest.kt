package com.fab.wab.customer.feature.salon.data

import com.fab.wab.customer.feature.salon.data.remote.ReviewsApi
import com.fab.wab.customer.feature.salon.data.repository.ReviewsRepositoryImpl
import com.fab.wab.customer.feature.salon.domain.model.ReviewDraft
import com.fab.wab.customer.feature.salon.domain.model.ReviewTarget
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.content.TextContent
import io.ktor.http.contentType
import io.ktor.http.headersOf
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** `POST /salons/{id}[/staff/{memberId}]/reviews` sends the optional `branchId` (BUSINESS_DOMAIN §5.11). */
class ReviewsRepositoryTest {

    private val bodies = mutableListOf<String>()
    private val client = HttpClient(
        MockEngine { request ->
            bodies += (request.body as? TextContent)?.text.orEmpty()
            respond(
                """{"success":true,"message":"","data":{"id":"r1","status":"PENDING"}}""",
                headers = headersOf(HttpHeaders.ContentType, ContentType.Application.Json.toString()),
            )
        },
    ) {
        install(ContentNegotiation) { json() }
        defaultRequest { contentType(ContentType.Application.Json) }
    }

    private fun sentBranch(index: Int): String? =
        Json.parseToJsonElement(bodies[index]).jsonObject[BRANCH_FIELD]?.jsonPrimitive?.takeIf { it.isString }?.content

    @Test
    fun salonAndStaffReviewsCarryTheBranchWhenGiven() = runTest {
        val repository = ReviewsRepositoryImpl(ReviewsApi(client))
        repository.submit(ReviewTarget.Salon("s1"), ReviewDraft(5, "great", branchId = "b2"))
        repository.submit(ReviewTarget.Staff("s1", "m1"), ReviewDraft(4, null, branchId = "b2"))
        repository.submit(ReviewTarget.Salon("s1"), ReviewDraft(3, null))
        assertEquals("b2", sentBranch(0))
        assertEquals("b2", sentBranch(1))
        assertNull(sentBranch(2))
    }

    private companion object {
        const val BRANCH_FIELD = "branchId"
    }
}

package com.fab.wab.customer.core.network

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.serialization.json.Json

class ApiErrorDtoTest {
    private val json = Json {
        ignoreUnknownKeys = true
    }

    @Test
    fun decodesBackendValidationErrors() {
        val apiError = json.decodeFromString<ApiErrorDto>(
            """
            {
                "message": "The provided credentials are incorrect.",
                "errors": {
                    "phone": ["The provided credentials are incorrect."]
                }
            }
            """.trimIndent()
        )

        assertEquals("The provided credentials are incorrect.", apiError.message)
        assertEquals(
            listOf("The provided credentials are incorrect."),
            apiError.errors["phone"]
        )
    }
}

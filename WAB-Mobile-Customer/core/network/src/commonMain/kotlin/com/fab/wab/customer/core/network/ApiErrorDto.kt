package com.fab.wab.customer.core.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ApiErrorDto(
    val status: Int = 0,
    val error: String? = null,
    val message: String? = null,
    @SerialName("code") val code: String? = null,
    @SerialName("fieldErrors") val fieldErrors: List<FieldValidationErrorDto>? = null,
    val errors: Map<String, List<String>> = emptyMap(),
)

@Serializable
data class FieldValidationErrorDto(
    val field: String = "",
    val message: String? = null,
)

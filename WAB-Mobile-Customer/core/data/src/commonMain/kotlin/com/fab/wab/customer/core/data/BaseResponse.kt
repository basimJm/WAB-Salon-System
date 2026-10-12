package com.fab.wab.customer.core.data

import kotlinx.serialization.Serializable

@Serializable
data class BaseResponse<T>(
    val success: Boolean,
    val message: String? = null,
    val data: T
)

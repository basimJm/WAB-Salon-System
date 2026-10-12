package com.fab.wab.customer.core.network.config

data class ApiConfig(
    val baseUrl: String,
    val authToken: String? = null,
    val connectTimeout: Long = 10_000L,
    val receiveTimeout: Long = 30_000L,
    val sendTimeout: Long = 30_000L,
    val isDebug: Boolean = false,
) {
    val useAuth: Boolean get() = !authToken.isNullOrBlank()
}

package com.fab.wab.customer.core.network

data class ApiConfig(
    val baseUrl: String,
    val connectTimeout: Long = 30_000L,
    val receiveTimeout: Long = 30_000L,
    val sendTimeout: Long = 30_000L
)

fun provideDefaultApiConfig(): ApiConfig = ApiConfig(baseUrl = "https://api.example.com")

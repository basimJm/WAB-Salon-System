package com.fab.wab.customer.core.domain.auth

/** The pair the backend issues at login and rotates on every refresh (BUSINESS_DOMAIN refreshTokens). */
data class AuthTokens(
    val accessToken: String,
    val refreshToken: String,
)

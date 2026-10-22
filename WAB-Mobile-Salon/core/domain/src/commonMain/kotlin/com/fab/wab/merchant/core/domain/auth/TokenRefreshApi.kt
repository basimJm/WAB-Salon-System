package com.fab.wab.merchant.core.domain.auth

import com.fab.wab.merchant.core.domain.session.MemberProfile

/**
 * Outcome of exchanging a refresh token. Only [Rejected] ends the session: [Unavailable] (no network,
 * timeout, server error) must keep the user signed in so a later request can try again.
 */
sealed interface TokenRefreshResult {
    /** New pair; [member] and [permissions] when the server returned the member (merchant refresh does). */
    data class Refreshed(
        val tokens: AuthTokens,
        val member: MemberProfile? = null,
        val permissions: Set<String>? = null,
    ) : TokenRefreshResult
    data object Rejected : TokenRefreshResult
    data object Unavailable : TokenRefreshResult
}

interface TokenRefreshApi {
    suspend fun refresh(refreshToken: String): TokenRefreshResult
}

/** Rotates the token pair now (single-flight with the 401 path) to re-read the member and its permissions. */
fun interface SessionRefresher {
    suspend fun refreshNow(): TokenRefreshResult
}

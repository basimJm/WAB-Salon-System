package com.fab.wab.merchant.core.network.auth

import com.fab.wab.merchant.core.domain.AppSettings
import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.auth.SessionRefresher
import com.fab.wab.merchant.core.domain.auth.TokenRefreshApi
import com.fab.wab.merchant.core.domain.auth.TokenRefreshResult
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Single-flight token refresh. Requests that fail with 401 at the same time queue on one lock; the first
 * one rotates the tokens, the others notice the stored access token already changed and reuse it, so the
 * rotating refresh token is never presented twice (the backend revokes the family on reuse).
 */
class TokenRefreshCoordinator(
    private val appSettings: AppSettings,
    private val api: TokenRefreshApi,
) : SessionRefresher {
    private val lock = Mutex()

    suspend fun refreshAfterUnauthorized(rejectedAccessToken: String?): TokenRefreshResult = lock.withLock {
        val storedAccess = appSettings.token.first()
        val storedRefresh = appSettings.refreshToken.first()
        when {
            !storedAccess.isNullOrBlank() && storedAccess != rejectedAccessToken ->
                TokenRefreshResult.Refreshed(AuthTokens(storedAccess, storedRefresh.orEmpty()))

            storedRefresh.isNullOrBlank() -> TokenRefreshResult.Rejected
            else -> rotate(storedRefresh)
        }
    }

    /** Explicit rotation (permission re-fetch); shares the lock, so it never races a 401 refresh. */
    override suspend fun refreshNow(): TokenRefreshResult = lock.withLock {
        val storedRefresh = appSettings.refreshToken.first()
        if (storedRefresh.isNullOrBlank()) TokenRefreshResult.Rejected else rotate(storedRefresh)
    }

    private suspend fun rotate(refreshToken: String): TokenRefreshResult {
        val result = api.refresh(refreshToken)
        if (result is TokenRefreshResult.Refreshed) {
            appSettings.setToken(result.tokens.accessToken)
            appSettings.setRefreshToken(result.tokens.refreshToken)
        }
        return result
    }
}

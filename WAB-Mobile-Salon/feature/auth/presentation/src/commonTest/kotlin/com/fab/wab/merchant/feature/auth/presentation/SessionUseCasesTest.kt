package com.fab.wab.merchant.feature.auth.presentation

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.feature.auth.domain.usecase.LogoutUseCase
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

class SessionUseCasesTest {
    @Test
    fun logoutRevokesTheRefreshTokenAndAlwaysClearsTheSession() = runTest {
        val store = FakeSessionStore(signedIn = true)
        val auth = FakeAuthRepository().apply { logoutResult = AppResult.Error(AppError.NetworkError("offline")) }
        assertIs<AppResult.Error>(LogoutUseCase(auth, store)())
        assertEquals(listOf("r"), auth.loggedOut)
        assertEquals(1, store.signOuts)
        assertTrue(store.sessionState.value is SessionState.Guest)
    }

    @Test
    fun logoutWithoutTokensSkipsTheBackend() = runTest {
        val store = FakeSessionStore(signedIn = false)
        val auth = FakeAuthRepository()
        assertEquals(AppResult.Success(Unit), LogoutUseCase(auth, store)())
        assertTrue(auth.loggedOut.isEmpty())
        assertEquals(1, store.signOuts)
    }
}

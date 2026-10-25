package com.fab.wab.merchant.core.storage

import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.security.InMemorySecureKeyValueStore
import com.fab.wab.merchant.core.storage.session.DataStoreSessionStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class AppSettingsImplTokensTest {

    private val dataStore = InMemoryPreferencesDataStore()
    private val secure = InMemorySecureKeyValueStore()
    private val sessionStore = DataStoreSessionStore(dataStore, secure)
    private val settings = AppSettingsImpl(dataStore, secure, sessionStore)

    @Test
    fun networkAndSessionStoreShareTheSameTokenPair() = runTest {
        sessionStore.signIn(AuthTokens("a1", "r1"), MemberProfile("m1", "s1", "Rami", MemberRole.OWNER), emptySet(), null)
        assertEquals("a1", settings.token.first())
        assertEquals("r1", settings.refreshToken.first())
        settings.setToken("a2")
        settings.setRefreshToken("r2")
        assertEquals(AuthTokens("a2", "r2"), sessionStore.tokens())
    }

    @Test
    fun clearSessionSignsOutButKeepsLanguage() = runTest {
        settings.setLanguage("en")
        sessionStore.signIn(AuthTokens("a1", "r1"), MemberProfile("m1", "s1", "Rami", MemberRole.OWNER), emptySet(), null)
        settings.clearSession()
        assertNull(settings.token.first())
        assertEquals(SessionState.Guest, sessionStore.state.first())
        assertEquals("en", settings.language.first())
    }
}

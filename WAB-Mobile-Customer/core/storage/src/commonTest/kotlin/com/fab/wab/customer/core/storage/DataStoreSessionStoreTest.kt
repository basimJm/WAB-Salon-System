package com.fab.wab.customer.core.storage

import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.core.security.InMemorySecureKeyValueStore
import com.fab.wab.customer.core.storage.session.DataStoreSessionStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class DataStoreSessionStoreTest {

    private val dataStore = InMemoryPreferencesDataStore()
    private val secure = InMemorySecureKeyValueStore()
    private val store = DataStoreSessionStore(dataStore, secure)
    private val tokens = AuthTokens(accessToken = "access-1", refreshToken = "refresh-1")
    private val user = UserProfile(firstName = "Omar", gender = Gender.MALE)

    @Test
    fun freshInstallIsAGuestWithDefaults() = runTest {
        assertEquals(SessionState.Guest(), store.state.first())
        assertFalse(store.onboardingSeen.first())
        assertTrue(store.pushEnabled.first())
        assertNull(store.tokens())
    }

    @Test
    fun guestIdentityStaysLocalAndDrivesTheScope() = runTest {
        store.setGuestProfile(GuestProfile(nickname = "Lina", gender = Gender.FEMALE))
        store.setOnboardingSeen(true)
        val state = store.state.first()
        assertEquals(SessionState.Guest(GuestProfile("Lina", Gender.FEMALE)), state)
        assertEquals(Gender.FEMALE, state.genderScope)
        assertTrue(store.onboardingSeen.first())
        store.setGuestProfile(GuestProfile(nickname = " ", gender = null))
        assertEquals(SessionState.Guest(), store.state.first())
    }

    @Test
    fun signInStoresTokensSecurelyAndSignOutKeepsLocalPreferences() = runTest {
        store.setOnboardingSeen(true)
        store.setGuestProfile(GuestProfile("Lina", Gender.FEMALE))
        store.setPushEnabled(false)
        store.signIn(tokens, user)
        assertEquals(SessionState.SignedIn(user), store.state.first())
        assertEquals(tokens, store.tokens())
        assertEquals("access-1", secure.read("access_token"))
        assertNull(dataStore.data.first().asMap().entries.firstOrNull { it.value == "access-1" })

        store.updateTokens(AuthTokens("access-2", "refresh-2"))
        assertEquals("access-2", store.tokens()?.accessToken)
        assertTrue(store.state.first().isSignedIn)

        store.signOut()
        assertNull(store.tokens())
        assertEquals(SessionState.Guest(GuestProfile("Lina", Gender.FEMALE)), store.state.first())
        assertTrue(store.onboardingSeen.first())
        assertFalse(store.pushEnabled.first())
    }

    @Test
    fun halfWrittenTokensCountAsSignedOut() = runTest {
        secure.write("access_token", "orphan")
        assertNull(store.tokens())
    }

    @Test
    fun clearAllForgetsEverything() = runTest {
        store.setOnboardingSeen(true)
        store.signIn(tokens, user)
        store.clearAll()
        assertEquals(SessionState.Guest(), store.state.first())
        assertFalse(store.onboardingSeen.first())
        assertNull(store.tokens())
        assertTrue(dataStore.data.first().asMap().isEmpty())
    }
}

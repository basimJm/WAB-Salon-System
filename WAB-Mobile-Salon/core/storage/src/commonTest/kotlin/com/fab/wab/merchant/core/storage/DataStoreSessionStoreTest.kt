package com.fab.wab.merchant.core.storage

import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.security.InMemorySecureKeyValueStore
import com.fab.wab.merchant.core.storage.session.DataStoreSessionStore
import com.fab.wab.merchant.core.storage.session.SessionKeys
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** MER-008: PRD §5 keys through one SessionStore; tokens only in the secure store. */
class DataStoreSessionStoreTest {

    private val dataStore = InMemoryPreferencesDataStore()
    private val secure = InMemorySecureKeyValueStore()
    private val store = DataStoreSessionStore(dataStore, secure)
    private val tokens = AuthTokens(accessToken = "access-1", refreshToken = "refresh-1")
    private val member = MemberProfile(id = "m1", salonId = "s1", firstName = "Rami", role = MemberRole.MANAGER)
    private val permissions = setOf("DASHBOARD_VIEW", "BOOKINGS_RESPOND")

    @Test
    fun freshInstallIsAGuestWithDefaults() = runTest {
        assertEquals(SessionState.Guest, store.state.first())
        assertTrue(store.pushEnabled.first())
        assertFalse(store.overlayPermissionPrompted.first())
        assertNull(store.tokens())
    }

    @Test
    fun signInStoresIdentityPermissionsAndStateWithTokensOnlyInTheSecureStore() = runTest {
        store.signIn(tokens, member, permissions, SalonState.APPROVED_INCOMPLETE)
        assertEquals(SessionState.SignedIn(member, permissions, SalonState.APPROVED_INCOMPLETE), store.state.first())
        assertEquals(tokens, store.tokens())
        assertEquals("access-1", secure.read("access_token"))
        val plain = dataStore.data.first().asMap().values
        assertFalse(plain.any { it == "access-1" || it == "refresh-1" }, "tokens never reach DataStore")
    }

    @Test
    fun permissionsAndSalonStateRefreshInPlace() = runTest {
        store.signIn(tokens, member, permissions, SalonState.LIVE)
        store.updatePermissions(setOf("BOOKINGS_VIEW_OWN"))
        store.updateSalonState(SalonState.OFFLINE)
        store.updateMember(member.copy(role = MemberRole.EMPLOYEE))
        val state = store.state.first() as SessionState.SignedIn
        assertEquals(setOf("BOOKINGS_VIEW_OWN"), state.permissions)
        assertEquals(SalonState.OFFLINE, state.salonState)
        assertEquals(MemberRole.EMPLOYEE, state.member.role)
        store.updateSalonState(null)
        assertNull((store.state.first() as SessionState.SignedIn).salonState)
    }

    @Test
    fun signOutKeepsPushAndOverlayPreferences() = runTest {
        store.setPushEnabled(false)
        store.setOverlayPermissionPrompted(true)
        store.signIn(tokens, member, permissions, SalonState.LIVE)
        store.signOut()
        assertEquals(SessionState.Guest, store.state.first())
        assertNull(store.tokens())
        assertFalse(store.pushEnabled.first())
        assertTrue(store.overlayPermissionPrompted.first())
    }

    @Test
    fun clearAllForgetsEverything() = runTest {
        store.setOverlayPermissionPrompted(true)
        store.signIn(tokens, member, permissions, SalonState.LIVE)
        store.clearAll()
        assertEquals(SessionState.Guest, store.state.first())
        assertNull(store.tokens())
        assertTrue(dataStore.data.first().asMap().isEmpty())
    }

    @Test
    fun unknownRoleOrMissingIdentityIsAGuest() = runTest {
        store.signIn(tokens, member, permissions, SalonState.LIVE)
        dataStore.updateData { prefs -> prefs.toMutablePreferences().apply { remove(SessionKeys.SALON_ID) } }
        assertEquals(SessionState.Guest, store.state.first())
        assertEquals(null, MemberRole.fromCode("ADMIN"))
        assertEquals(SalonState.LIVE, SalonState.fromCode(" live "))
    }
}

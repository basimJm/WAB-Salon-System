package com.fab.wab.merchant.core.domain.permission

import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.auth.SessionRefresher
import com.fab.wab.merchant.core.domain.auth.TokenRefreshResult
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.session.SessionStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

internal class FakeSessionStore(initial: SessionState) : SessionStore {
    val session = MutableStateFlow(initial)
    var signedOut = false
    override val state: Flow<SessionState> = session
    override val pushEnabled: Flow<Boolean> = MutableStateFlow(true)
    override val overlayPermissionPrompted: Flow<Boolean> = MutableStateFlow(false)
    override suspend fun tokens(): AuthTokens? = null
    override suspend fun signIn(tokens: AuthTokens, member: MemberProfile, permissions: Set<String>, salonState: SalonState?) = Unit
    override suspend fun updateTokens(tokens: AuthTokens) = Unit
    override suspend fun updateMember(member: MemberProfile) {
        session.value = (session.value as SessionState.SignedIn).copy(member = member)
    }
    override suspend fun updatePermissions(permissions: Set<String>) {
        session.value = (session.value as SessionState.SignedIn).copy(permissions = permissions)
    }
    override suspend fun updateSalonState(salonState: SalonState?) = Unit
    override suspend fun setPushEnabled(enabled: Boolean) = Unit
    override suspend fun setOverlayPermissionPrompted(prompted: Boolean) = Unit
    override suspend fun signOut() {
        signedOut = true
        session.value = SessionState.Guest
    }
    override suspend fun clearAll() = Unit
}

/** MER-009: permissions re-fetch through the shared refresher; a refused session signs out. */
class PermissionsSyncTest {
    private val member = MemberProfile("m1", "s1", "Rami", MemberRole.EMPLOYEE)
    private val signedIn = SessionState.SignedIn(member, setOf("BOOKINGS_VIEW_OWN"))
    private val tokens = AuthTokens("a2", "r2")

    @Test
    fun guestsAreNotRefreshed() = runTest {
        var calls = 0
        val sync = PermissionsSync({ calls++; TokenRefreshResult.Rejected }, FakeSessionStore(SessionState.Guest))
        assertEquals(PermissionsRefresh.Unchanged, sync.refresh())
        assertEquals(0, calls)
    }

    @Test
    fun refreshedMemberAndKeysReplaceTheCache() = runTest {
        val store = FakeSessionStore(signedIn)
        val promoted = member.copy(role = MemberRole.MANAGER)
        val refresher = SessionRefresher { TokenRefreshResult.Refreshed(tokens, promoted, setOf("BOOKINGS_RESPOND")) }
        val result = PermissionsSync(refresher, store).refresh() as PermissionsRefresh.Updated
        assertTrue(result.permissions.has(Permission.BOOKINGS_RESPOND))
        assertEquals(MemberRole.MANAGER, (store.state.first() as SessionState.SignedIn).member.role)
    }

    @Test
    fun refusedSessionSignsOutAndUnavailableKeepsTheCache() = runTest {
        val refused = FakeSessionStore(signedIn)
        assertEquals(PermissionsRefresh.SignedOut, PermissionsSync({ TokenRefreshResult.Rejected }, refused).refresh())
        assertTrue(refused.signedOut)
        val offline = FakeSessionStore(signedIn)
        assertEquals(PermissionsRefresh.Unchanged, PermissionsSync({ TokenRefreshResult.Unavailable }, offline).refresh())
        assertEquals(signedIn, offline.state.first())
    }
}

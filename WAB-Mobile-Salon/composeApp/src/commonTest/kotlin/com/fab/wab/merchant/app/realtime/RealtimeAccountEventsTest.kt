package com.fab.wab.merchant.app.realtime

import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.auth.TokenRefreshResult
import com.fab.wab.merchant.core.domain.permission.PermissionsSync
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.realtime.FakeRealtimeClient
import com.fab.wab.merchant.core.realtime.RealtimeEvent
import com.fab.wab.merchant.core.realtime.RealtimeEvents
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

private class RecordingSessionStore : SessionStore {
    var signOuts = 0
    override val state: Flow<SessionState> =
        MutableStateFlow(SessionState.SignedIn(MemberProfile("m1", "s1", "Rami", MemberRole.EMPLOYEE)))
    override val pushEnabled: Flow<Boolean> = MutableStateFlow(true)
    override val overlayPermissionPrompted: Flow<Boolean> = MutableStateFlow(false)
    override suspend fun tokens(): AuthTokens? = null
    override suspend fun signIn(tokens: AuthTokens, member: MemberProfile, permissions: Set<String>, salonState: SalonState?) = Unit
    override suspend fun updateTokens(tokens: AuthTokens) = Unit
    override suspend fun updateMember(member: MemberProfile) = Unit
    override suspend fun updatePermissions(permissions: Set<String>) = Unit
    override suspend fun updateSalonState(salonState: SalonState?) = Unit
    override suspend fun setPushEnabled(enabled: Boolean) = Unit
    override suspend fun setOverlayPermissionPrompted(prompted: Boolean) = Unit
    override suspend fun signOut() {
        signOuts += 1
    }
    override suspend fun clearAll() = Unit
}

/** MER-011: account events of the member room. */
@OptIn(ExperimentalCoroutinesApi::class)
class RealtimeAccountEventsTest {
    @Test
    fun permissionsUpdatedReFetchesAndAccessRevokedSignsOut() = runTest(UnconfinedTestDispatcher()) {
        val client = FakeRealtimeClient()
        val store = RecordingSessionStore()
        var refreshes = 0
        var revoked = 0
        val sync = PermissionsSync({ refreshes++; TokenRefreshResult.Unavailable }, store)
        RealtimeAccountEvents(client, sync, store).start(backgroundScope) { revoked++ }

        client.emit(RealtimeEvent(RealtimeEvents.PERMISSIONS_UPDATED))
        client.emit(RealtimeEvent(RealtimeEvents.BOOKING_UPDATED))
        assertEquals(1, refreshes)
        assertEquals(0, store.signOuts)

        client.emit(RealtimeEvent(RealtimeEvents.ACCESS_REVOKED))
        assertEquals(1, store.signOuts)
        assertTrue(revoked == 1)
    }

    @Test
    fun aPermissionRefusalFromAnyCallReFetchesThePermissions() = runTest(UnconfinedTestDispatcher()) {
        val store = RecordingSessionStore()
        val denied = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
        var refreshes = 0
        val sync = PermissionsSync({ refreshes++; TokenRefreshResult.Unavailable }, store)
        RealtimeAccountEvents(FakeRealtimeClient(), sync, store, denied).start(backgroundScope) {}

        denied.emit(Unit)
        assertEquals(1, refreshes)
        assertEquals(0, store.signOuts)
    }
}

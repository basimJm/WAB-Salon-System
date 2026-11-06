package com.fab.wab.merchant.app.push

import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SessionState
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** A runaway sync loop would reach this; the test then fails on its count instead of hanging. */
private const val RUNAWAY_SYNCS = 50

private val OWNER = SessionState.SignedIn(MemberProfile(id = "m1", salonId = "s1", firstName = "Rami", role = MemberRole.OWNER))

@OptIn(ExperimentalCoroutinesApi::class)
class InstallationSyncTest {

    private val session = MutableStateFlow<SessionState>(SessionState.Guest)
    private val tokens = MutableSharedFlow<String>(extraBufferCapacity = 4)
    private var syncs = 0

    private fun sync() = InstallationSync(session, tokens) { syncs += 1 }

    @Test
    fun aGuestNeverSyncsNotEvenOnATokenUpdate() = runTest(UnconfinedTestDispatcher()) {
        val job = sync().start(backgroundScope)
        tokens.emit("fcm-1")
        assertEquals(0, syncs)
        job.cancel()
    }

    @Test
    fun aSignedInStartSyncsOnceAndEveryNewTokenSyncsAgain() = runTest(UnconfinedTestDispatcher()) {
        session.value = OWNER
        val job = sync().start(backgroundScope)
        assertEquals(1, syncs, "app start while signed in")
        tokens.emit("fcm-1")
        assertEquals(2, syncs)
        tokens.emit("fcm-2")
        assertEquals(3, syncs)
        job.cancel()
    }

    @Test
    fun theSameTokenTwiceSyncsOnce() = runTest(UnconfinedTestDispatcher()) {
        session.value = OWNER
        val job = sync().start(backgroundScope)
        tokens.emit("fcm-1")
        tokens.emit("fcm-1")
        assertEquals(2, syncs, "app start + the token; the repeat is the same token")
        tokens.emit("fcm-2")
        assertEquals(3, syncs, "a new token syncs again")
        tokens.emit("fcm-2")
        assertEquals(3, syncs)
        job.cancel()
    }

    @Test
    fun aSyncThatRepublishesTheSameTokenEndsAfterThatTokensSync() = runTest(UnconfinedTestDispatcher()) {
        // The relay replays its latest token, and reading the token during a sync publishes it again (the MER-094 loop).
        val relay = MutableSharedFlow<String>(replay = 1, extraBufferCapacity = 1)
        var token = "fcm-1"
        session.value = OWNER
        val job = InstallationSync(session, relay) {
            syncs += 1
            if (syncs < RUNAWAY_SYNCS) relay.tryEmit(token)
        }.start(backgroundScope)
        advanceUntilIdle()
        assertEquals(2, syncs, "app start, then the token it published; the republished copies are the same token")
        relay.tryEmit("fcm-1")
        advanceUntilIdle()
        assertEquals(2, syncs, "a later republish of the same token does not sync")
        token = "fcm-2"
        relay.tryEmit(token)
        advanceUntilIdle()
        assertEquals(3, syncs, "a rotated token syncs once, then its republish is the same token")
        job.cancel()
    }

    @Test
    fun signingInSyncsAndSigningOutStopsListeningToTokens() = runTest(UnconfinedTestDispatcher()) {
        val job = sync().start(backgroundScope)
        session.value = OWNER
        assertEquals(1, syncs, "login on a running app")
        session.value = SessionState.Guest
        tokens.emit("fcm-1")
        assertEquals(1, syncs, "a guest does not register the device")
        session.value = OWNER
        assertEquals(2, syncs, "signing in again registers again")
        job.cancel()
    }

    @Test
    fun aSessionRefreshWhileSignedInDoesNotSyncAgain() = runTest(UnconfinedTestDispatcher()) {
        session.value = OWNER
        val job = sync().start(backgroundScope)
        session.value = SessionState.SignedIn(OWNER.member.copy(firstName = "Rami S."))
        assertEquals(1, syncs, "same signed-in state, new profile data")
        job.cancel()
    }

    @Test
    fun signingOutCancelsASyncStillInFlight() = runTest(UnconfinedTestDispatcher()) {
        val gate = CompletableDeferred<Unit>()
        var finished = false
        session.value = OWNER
        val job = InstallationSync(session, tokens) {
            gate.await()
            finished = true
        }.start(backgroundScope)
        session.value = SessionState.Guest
        gate.complete(Unit)
        assertTrue(!finished, "the PUT of a member who left is dropped")
        job.cancel()
    }
}

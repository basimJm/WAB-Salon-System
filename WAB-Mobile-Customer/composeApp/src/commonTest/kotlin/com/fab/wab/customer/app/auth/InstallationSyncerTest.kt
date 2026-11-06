package com.fab.wab.customer.app.auth

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.feature.auth.domain.model.InstallationInfo
import com.fab.wab.customer.feature.auth.domain.model.InstallationLink
import com.fab.wab.customer.feature.auth.domain.repository.InstallationsRepository
import com.fab.wab.customer.feature.auth.domain.usecase.SyncInstallationUseCase
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals

/** A runaway sync loop would reach this; the test then fails on its count instead of hanging. */
private const val RUNAWAY_SYNCS = 50

private class RecordingInstallations : InstallationsRepository {
    val registered = mutableListOf<Pair<InstallationInfo, String>>()
    var pushCalls = mutableListOf<Boolean>()
    override suspend fun register(info: InstallationInfo, language: String): AppResult<InstallationLink> {
        registered += info to language
        return AppResult.Success(InstallationLink(info.installationId, linked = false))
    }
    override suspend fun setPushEnabled(enabled: Boolean): AppResult<Unit> {
        pushCalls += enabled
        return AppResult.Success(Unit)
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class InstallationSyncerTest {

    private val installations = RecordingInstallations()
    private val session = MutableStateFlow<SessionState>(SessionState.Guest())
    private val language = MutableStateFlow("ar")
    private val pushTokens = MutableSharedFlow<String>()
    private val info = InstallationInfo("inst-1", "ANDROID", "1.0", fcmToken = "fcm")

    private fun syncer(provideInfo: Boolean = true) = InstallationSyncer(
        sync = SyncInstallationUseCase(installations, { if (provideInfo) info else null }, language),
        session = session,
        language = language,
        pushTokens = pushTokens,
    )

    @Test
    fun registersAtLaunchAndOnEveryRelevantChange() = runTest(UnconfinedTestDispatcher()) {
        val syncer = syncer()
        syncer.start(backgroundScope)
        assertEquals(listOf(InstallationTrigger.Launch), syncer.performed)
        assertEquals("ar", installations.registered.single().second)

        session.value = SessionState.SignedIn(UserProfile("c1", "Omar", Gender.MALE))
        session.value = SessionState.SignedIn(UserProfile("c1", "Omar", Gender.FEMALE))
        assertEquals(listOf(InstallationTrigger.Launch, InstallationTrigger.SessionChange), syncer.performed)

        language.value = "en"
        assertEquals(InstallationTrigger.LanguageChange, syncer.performed.last())
        assertEquals("en", installations.registered.last().second)

        pushTokens.emit("fcm-2")
        assertEquals(InstallationTrigger.PushTokenRefresh, syncer.performed.last())
        assertEquals(4, installations.registered.size)
    }

    @Test
    fun theSameTokenTwiceRefreshesOnceAndANewTokenRefreshesAgain() = runTest(UnconfinedTestDispatcher()) {
        val syncer = syncer()
        syncer.start(backgroundScope)
        pushTokens.emit("fcm-2")
        pushTokens.emit("fcm-2")
        assertEquals(listOf(InstallationTrigger.Launch, InstallationTrigger.PushTokenRefresh), syncer.performed)
        pushTokens.emit("fcm-3")
        assertEquals(3, installations.registered.size)
        pushTokens.emit("fcm-3")
        assertEquals(3, installations.registered.size)
    }

    @Test
    fun aSyncThatRepublishesTheSameTokenEndsAfterThatTokensSync() = runTest(UnconfinedTestDispatcher()) {
        // The relay replays its latest token, and reading the token during a sync publishes it again (the CUS-113 loop).
        val relay = MutableSharedFlow<String>(replay = 1, extraBufferCapacity = 1)
        val syncer = InstallationSyncer(
            sync = SyncInstallationUseCase(
                installations,
                { info.also { if (installations.registered.size < RUNAWAY_SYNCS) relay.tryEmit("fcm-1") } },
                language,
            ),
            session = session,
            language = language,
            pushTokens = relay,
        )
        syncer.start(backgroundScope)
        advanceUntilIdle()
        assertEquals(
            listOf(InstallationTrigger.Launch, InstallationTrigger.PushTokenRefresh),
            syncer.performed,
            "launch, then the token it published; the republished copies are the same token",
        )
        relay.tryEmit("fcm-1")
        advanceUntilIdle()
        assertEquals(2, installations.registered.size, "a later republish of the same token does not sync")
    }

    @Test
    fun withoutAnInstanceIdNothingIsSent() = runTest(UnconfinedTestDispatcher()) {
        syncer(provideInfo = false).start(backgroundScope)
        assertEquals(0, installations.registered.size)
    }
}

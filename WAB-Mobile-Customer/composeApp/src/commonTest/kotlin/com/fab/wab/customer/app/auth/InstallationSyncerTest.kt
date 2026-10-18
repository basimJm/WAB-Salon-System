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
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals

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
    fun withoutAnInstanceIdNothingIsSent() = runTest(UnconfinedTestDispatcher()) {
        syncer(provideInfo = false).start(backgroundScope)
        assertEquals(0, installations.registered.size)
    }
}

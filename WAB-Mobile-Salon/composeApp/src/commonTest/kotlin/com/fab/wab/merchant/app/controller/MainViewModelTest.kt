package com.fab.wab.merchant.app.controller

import com.fab.wab.merchant.app.analytics.SessionAnalyticsSync
import com.fab.wab.merchant.app.controller.contract.MainContract.UiAction
import com.fab.wab.merchant.app.controller.vm.MainViewModel
import com.fab.wab.merchant.app.realtime.RealtimeAccountEvents
import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.common.AppEnvironment
import com.fab.wab.merchant.core.domain.AppLanguage
import com.fab.wab.merchant.core.domain.AppSettings
import com.fab.wab.merchant.core.domain.AppearanceSettings
import com.fab.wab.merchant.core.domain.ThemeMode
import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.auth.TokenRefreshResult
import com.fab.wab.merchant.core.domain.permission.PermissionsSync
import com.fab.wab.merchant.core.domain.repository.SessionTimeOut
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.firebase.FakeCrashReporter
import com.fab.wab.merchant.core.realtime.FakeRealtimeClient
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest

private class FakeSessionTimeOut : SessionTimeOut {
    override val sessionEventTimeOut: Channel<Boolean> = Channel(Channel.BUFFERED)
    val sent = mutableListOf<Boolean>()
    override suspend fun sendSessionTimeOut(isTimeOut: Boolean) {
        sent += isTimeOut
    }
}

private class MinimalAppSettings : AppSettings {
    var sessionCleared = 0
    private val text = MutableStateFlow<String?>(null)
    override val language: Flow<String> = MutableStateFlow(AppLanguage.DEFAULT.code)
    override val themeMode: Flow<ThemeMode> = MutableStateFlow(ThemeMode.DARK)
    override val token: Flow<String?> = text
    override val fcmToken: Flow<String?> = text
    override val refreshToken: Flow<String?> = text
    override val userId: Flow<String?> = text
    override val userRole: Flow<String?> = text
    override val userName: Flow<String?> = text
    override val onboardingCompleted: Flow<Boolean> = MutableStateFlow(false)
    override val lastSyncTimestamp: Flow<Long?> = MutableStateFlow(null)
    override val deviceId: Flow<String?> = text
    override suspend fun setLanguage(language: String) = Unit
    override suspend fun setThemeMode(mode: ThemeMode) = Unit
    override suspend fun setToken(token: String?) = Unit
    override suspend fun setFcmToken(fcmToken: String?) = Unit
    override suspend fun setRefreshToken(token: String?) = Unit
    override suspend fun setUserId(id: String?) = Unit
    override suspend fun setUserRole(role: String?) = Unit
    override suspend fun setUserName(name: String?) = Unit
    override suspend fun setOnboardingCompleted(completed: Boolean) = Unit
    override suspend fun setLastSyncTimestamp(timestamp: Long) = Unit
    override suspend fun setDeviceId(id: String?) = Unit
    override suspend fun clearAll() = Unit
    override suspend fun clearSession() {
        sessionCleared += 1
    }
}

/** Session store that only reports a fixed state (the shell reads `state`; nothing here writes). */
private class StaticSessionStore(initial: SessionState) : SessionStore {
    override val state: Flow<SessionState> = MutableStateFlow(initial)
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
    override suspend fun signOut() = Unit
    override suspend fun clearAll() = Unit
}

@OptIn(ExperimentalCoroutinesApi::class)
class MainViewModelTest {

    private val environment = AppEnvironment("dev", "https://api.example", "https://web.example", "1.2.3", 7, isDebug = true)
    private val settings = MinimalAppSettings()
    private val sessionTimeOut = FakeSessionTimeOut()
    private val sessionStore = StaticSessionStore(
        SessionState.SignedIn(MemberProfile("m1", "s1", "Rami", MemberRole.OWNER)),
    )
    private var refreshes = 0
    private val permissionsSync = PermissionsSync({ refreshes++; TokenRefreshResult.Unavailable }, sessionStore)

    private fun TestScope.viewModel() = MainViewModel(
        appSettings = settings,
        appearanceSettings = AppearanceSettings(settings),
        sessionTimeOut = sessionTimeOut,
        environment = environment,
        sessionAnalyticsSync = SessionAnalyticsSync(MutableStateFlow(SessionState.Guest), NoOpAnalyticsTracker, FakeCrashReporter()),
        permissionsSync = permissionsSync,
        accountEvents = RealtimeAccountEvents(FakeRealtimeClient(), permissionsSync, sessionStore),
        testScope = backgroundScope,
    )

    @Test
    fun stateCarriesTheAppVersion() = runTest(UnconfinedTestDispatcher()) {
        assertEquals("1.2.3", viewModel().state.first().appVersion)
    }

    @Test
    fun permissionsAreReFetchedOnAppStart() = runTest(UnconfinedTestDispatcher()) {
        viewModel()
        assertEquals(1, refreshes)
    }

    @Test
    fun sessionTimeOutClearsTheSessionAndResetsTheSignal() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.onEvent(UiAction.OnSessionTimeOut)
        assertEquals(1, settings.sessionCleared)
        assertEquals(listOf(false), sessionTimeOut.sent)
    }
}

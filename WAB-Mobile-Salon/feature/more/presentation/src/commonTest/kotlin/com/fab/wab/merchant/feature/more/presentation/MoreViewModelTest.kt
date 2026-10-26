package com.fab.wab.merchant.feature.more.presentation

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsScreen
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.AnalyticsValue
import com.fab.wab.merchant.feature.more.presentation.analytics.MoreAnalytics
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppLanguage
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.AppSettings
import com.fab.wab.merchant.core.domain.AppearanceSettings
import com.fab.wab.merchant.core.domain.ThemeMode
import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.config.AppConfig
import com.fab.wab.merchant.core.domain.config.AppConfigRepository
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.ui.alert.RequestAlert
import com.fab.wab.merchant.core.ui.alert.RequestAlertSound
import com.fab.wab.merchant.core.ui.permission.FakeOverlayPermission
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.model.AuthSession
import com.fab.wab.merchant.feature.auth.domain.model.OtpPolicy
import com.fab.wab.merchant.feature.auth.domain.model.OtpProof
import com.fab.wab.merchant.feature.auth.domain.model.PhoneCheck
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.auth.domain.repository.AuthRepository
import com.fab.wab.merchant.feature.auth.domain.usecase.LogoutUseCase
import com.fab.wab.merchant.feature.auth.domain.model.InstallationInfo
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MoreContract.SideEffect
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MoreContract.UiAction
import com.fab.wab.merchant.feature.more.presentation.controller.vm.MoreDependencies
import com.fab.wab.merchant.feature.more.presentation.controller.vm.MoreViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

private class FakeSession : SessionStore {
    val sessionState = MutableStateFlow<SessionState>(SessionState.SignedIn(MemberProfile("m", "s", "Huda", MemberRole.OWNER)))
    val push = MutableStateFlow(true)
    var signedOut = 0
    var cleared = 0
    override val state: Flow<SessionState> = sessionState
    override val pushEnabled: Flow<Boolean> = push
    override val overlayPermissionPrompted: Flow<Boolean> = MutableStateFlow(false)
    override suspend fun tokens(): AuthTokens? = AuthTokens("a", "r")
    override suspend fun signIn(tokens: AuthTokens, member: MemberProfile, permissions: Set<String>, salonState: SalonState?) = Unit
    override suspend fun updateTokens(tokens: AuthTokens) = Unit
    override suspend fun updateMember(member: MemberProfile) = Unit
    override suspend fun updatePermissions(permissions: Set<String>) = Unit
    override suspend fun updateSalonState(salonState: SalonState?) = Unit
    override suspend fun setPushEnabled(enabled: Boolean) {
        push.value = enabled
    }
    override suspend fun setOverlayPermissionPrompted(prompted: Boolean) = Unit
    override suspend fun signOut() {
        signedOut += 1
        sessionState.value = SessionState.Guest
    }
    override suspend fun clearAll() {
        cleared += 1
        sessionState.value = SessionState.Guest
    }
}

private class FakeSettings : AppSettings {
    val languageState = MutableStateFlow(AppLanguage.DEFAULT.code)
    val themeState = MutableStateFlow(ThemeMode.SYSTEM)
    private val text = MutableStateFlow<String?>(null)
    override val language: Flow<String> = languageState
    override val themeMode: Flow<ThemeMode> = themeState
    override val token: Flow<String?> = text
    override val fcmToken: Flow<String?> = text
    override val refreshToken: Flow<String?> = text
    override val userId: Flow<String?> = text
    override val userRole: Flow<String?> = text
    override val userName: Flow<String?> = text
    override val onboardingCompleted: Flow<Boolean> = MutableStateFlow(false)
    override val lastSyncTimestamp: Flow<Long?> = MutableStateFlow(null)
    override val deviceId: Flow<String?> = text
    override suspend fun setLanguage(language: String) {
        languageState.value = language
    }
    override suspend fun setThemeMode(mode: ThemeMode) {
        themeState.value = mode
    }
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
    override suspend fun clearSession() = Unit
}

private class FakeAuth : AuthRepository {
    val loggedOut = mutableListOf<String>()
    private val error = AppResult.Error(AppError.NetworkError("x"))
    override suspend fun checkPhone(phone: PhoneNumber): AppResult<PhoneCheck> = error
    override suspend fun requestOtp(phoneE164: String, purpose: AuthPurpose): AppResult<OtpPolicy> = error
    override suspend fun verifyOtp(phoneE164: String, purpose: AuthPurpose, code: String): AppResult<OtpProof> = error
    override suspend fun login(phone: PhoneNumber, otpToken: String, installation: InstallationInfo?): AppResult<AuthSession> = error
    override suspend fun logout(refreshToken: String): AppResult<Unit> {
        loggedOut += refreshToken
        return error
    }
}

private class CountingAlert : RequestAlert {
    var plays = 0
    override fun play(sound: RequestAlertSound, vibrate: Boolean) {
        plays += 1
    }
    override fun stop() = Unit
}

private class NoConfig : AppConfigRepository {
    override val current: StateFlow<AppConfig?> = MutableStateFlow(null)
    override suspend fun refresh(): AppResult<AppConfig> = AppResult.Error(AppError.NetworkError("x"))
}

@OptIn(ExperimentalCoroutinesApi::class)
class MoreViewModelTest {

    private val session = FakeSession()
    private val settings = FakeSettings()
    private val overlay = FakeOverlayPermission()
    private val alert = CountingAlert()
    private val auth = FakeAuth()
    private val account = FakeAccount()

    private val tracker = object : AnalyticsTracker {
        val actions = mutableListOf<AnalyticsAction>()
        override fun trackScreen(screen: AnalyticsScreen) = Unit
        override fun trackAction(action: AnalyticsAction) {
            actions += action
        }
        override fun trackRoute(route: String?) = Unit
        override fun setUserId(userId: String?) = Unit
        override fun setUserProperty(key: String, value: String?) = Unit
    }

    private fun TestScope.viewModel() = MoreViewModel(
        MoreDependencies(
            session,
            AppearanceSettings(settings),
            NoConfig(),
            overlay,
            alert,
            LogoutUseCase(auth, session),
            tracker,
            "1.2.0",
            12,
            account,
            { "failed" },
        ),
        testScope = backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    @Test
    fun settingsChangeLanguageThemePushAndOverlay() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val state = viewModel.state.first { it.memberName.isNotEmpty() }
        assertEquals("Huda", state.memberName)
        assertEquals(MemberRole.OWNER, state.role)
        assertEquals("1.2.0", state.version)
        viewModel.onEvent(UiAction.OnLanguageToggle)
        assertEquals(AppLanguage.ENGLISH.code, settings.languageState.value)
        viewModel.onEvent(UiAction.OnDarkMode(true))
        assertEquals(ThemeMode.DARK, viewModel.state.first().themeMode)
        viewModel.onEvent(UiAction.OnPush(false))
        assertFalse(viewModel.state.first().pushEnabled)
        assertTrue(viewModel.state.first().overlaySupported)
        viewModel.onEvent(UiAction.OnOverlay)
        assertEquals(1, overlay.opened)
        overlay.granted = true
        viewModel.onEvent(UiAction.OnResume)
        assertTrue(viewModel.state.first().overlayGranted)
        val result = tracker.actions.single { it.name == MoreAnalytics.ACTION_OVERLAY_RESULT }
        assertEquals(AnalyticsValue.Flag(true), result.params[MoreAnalytics.PARAM_GRANTED])
        viewModel.onEvent(UiAction.OnResume)
        assertEquals(1, tracker.actions.count { it.name == MoreAnalytics.ACTION_OVERLAY_RESULT }, "reported once per visit")
        viewModel.onEvent(UiAction.OnOverlay)
        assertEquals(1, overlay.opened)
        viewModel.onEvent(UiAction.OnSoundTest)
        assertEquals(1, alert.plays)
    }

    @Test
    fun linksAndLogoutAfterConfirmation() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }
        viewModel.state.first { it.memberName.isNotEmpty() }
        viewModel.onEvent(UiAction.OnFaq)
        viewModel.onEvent(UiAction.OnContent("terms"))
        viewModel.onEvent(UiAction.OnNotifications)
        viewModel.onEvent(UiAction.OnCall)
        assertEquals(listOf(SideEffect.OpenFaq, SideEffect.OpenContent("terms"), SideEffect.OpenNotifications), effects)
        viewModel.onEvent(UiAction.OnLogout)
        assertTrue(viewModel.state.first().logoutDialog)
        assertEquals(0, session.signedOut)
        viewModel.onEvent(UiAction.OnLogoutConfirm)
        assertEquals(listOf("r"), auth.loggedOut)
        assertEquals(1, session.signedOut)
    }

    @Test
    fun accountPhotoPushSwitchOnTheServerAndRollbackOnFailure() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }
        assertEquals(ACCOUNT.photoUrl, viewModel.state.first { it.photoUrl != null }.photoUrl)
        viewModel.onEvent(UiAction.OnAccount)
        viewModel.onEvent(UiAction.OnPush(false))
        assertEquals("push:false", account.calls.last())
        assertFalse(session.push.value)
        account.fail = true
        viewModel.onEvent(UiAction.OnPush(true))
        assertFalse(session.push.value, "the old value comes back")
        assertEquals(listOf(SideEffect.OpenAccount, SideEffect.ShowError("failed")), effects)
    }

    @Test
    fun ownerSendsADeletionRequestAndMembersLeave() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.state.first { it.memberName.isNotEmpty() }
        viewModel.onEvent(UiAction.OnDeleteAccount)
        viewModel.onEvent(UiAction.OnDeletionNote("Closing the salon"))
        viewModel.onEvent(UiAction.OnDeleteConfirm)
        assertEquals("deletion:Closing the salon", account.calls.last())
        assertEquals("2026-10-25T09:00:00Z", viewModel.state.first().deletionRequestedAt)
        assertEquals(0, session.cleared)
        assertTrue(tracker.actions.any { it.name == MoreAnalytics.ACTION_DELETE_REQUEST })
        session.sessionState.value = SessionState.SignedIn(MemberProfile("m2", "s", "Sara", MemberRole.EMPLOYEE, "b1"))
        viewModel.onEvent(UiAction.OnDeleteAccount)
        viewModel.onEvent(UiAction.OnDeleteConfirm)
        assertEquals("leave", account.calls.last())
        assertEquals(1, session.cleared)
        assertFalse(viewModel.state.first().deleteSheet)
    }
}

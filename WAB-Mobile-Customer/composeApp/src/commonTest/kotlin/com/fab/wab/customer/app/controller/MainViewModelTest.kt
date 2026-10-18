package com.fab.wab.customer.app.controller

import com.fab.wab.customer.app.analytics.SessionAnalyticsSync
import com.fab.wab.customer.app.controller.contract.MainContract.SideEffect
import com.fab.wab.customer.app.controller.contract.MainContract.UiAction
import com.fab.wab.customer.app.controller.vm.MainViewModel
import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppLanguage
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.AppSettings
import com.fab.wab.customer.core.domain.AppearanceSettings
import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.core.domain.config.AppConfig
import com.fab.wab.customer.core.domain.config.AppConfigRepository
import com.fab.wab.customer.core.domain.config.LaunchGate
import com.fab.wab.customer.core.domain.config.MaintenancePolicy
import com.fab.wab.customer.core.domain.config.OtpConfig
import com.fab.wab.customer.core.domain.config.UpdatePolicy
import com.fab.wab.customer.core.domain.config.UpdateStatus
import com.fab.wab.customer.core.domain.repository.SessionTimeOut
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.firebase.FakeCrashReporter
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.channels.Channel
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
import kotlin.test.assertNull
import kotlin.test.assertTrue

private const val STORE_URL = "https://store.example/wab"

private val CONFIG = AppConfig(
    update = UpdatePolicy(UpdateStatus.OK, storeUrl = STORE_URL),
    maintenance = MaintenancePolicy(enabled = false),
    nearbyRadiusKm = 5.0,
    otp = OtpConfig(length = 6, resendAfterSeconds = 60),
)

private class FakeConfigRepository(var result: AppResult<AppConfig>) : AppConfigRepository {
    override val current: StateFlow<AppConfig?> = MutableStateFlow(null)
    var calls = 0
    override suspend fun refresh(): AppResult<AppConfig> {
        calls += 1
        return result
    }
}

private class FakeSessionTimeOut : SessionTimeOut {
    override val sessionEventTimeOut: Channel<Boolean> = Channel(Channel.BUFFERED)
    override suspend fun sendSessionTimeOut(isTimeOut: Boolean) = sessionEventTimeOut.send(isTimeOut)
}

private class MinimalAppSettings : AppSettings {
    var sessionCleared = 0
    private val text = MutableStateFlow<String?>(null)
    override val language: Flow<String> = MutableStateFlow(AppLanguage.DEFAULT.code)
    override val themeMode: Flow<ThemeMode> = MutableStateFlow(ThemeMode.SYSTEM)
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

@OptIn(ExperimentalCoroutinesApi::class)
class MainViewModelTest {

    private val environment = AppEnvironment("dev", "https://api.example", "1.2.3", 7, isDebug = true)
    private val settings = MinimalAppSettings()
    private val sessionTimeOut = FakeSessionTimeOut()

    private fun TestScope.viewModel(repository: AppConfigRepository) = MainViewModel(
        appSettings = settings,
        appearanceSettings = AppearanceSettings(settings),
        appConfigRepository = repository,
        sessionTimeOut = sessionTimeOut,
        environment = environment,
        sessionAnalyticsSync = SessionAnalyticsSync(MutableStateFlow(SessionState.Guest()), NoOpAnalyticsTracker, FakeCrashReporter()),
        errorText = { "failed" },
        testScope = backgroundScope,
    )

    @Test
    fun readyConfigLeavesTheSplash() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel(FakeConfigRepository(AppResult.Success(CONFIG)))
        val state = viewModel.state.first { !it.loading }
        assertEquals(LaunchGate.Ready, state.gate)
        assertEquals("1.2.3", state.appVersion)
        assertNull(state.error)
    }

    @Test
    fun maintenanceBlocksAndRetryReloads() = runTest(UnconfinedTestDispatcher()) {
        val repository = FakeConfigRepository(
            AppResult.Success(CONFIG.copy(maintenance = MaintenancePolicy(enabled = true, message = "back soon"))),
        )
        val viewModel = viewModel(repository)
        assertEquals(LaunchGate.Maintenance("back soon"), viewModel.state.first { !it.loading }.gate)
        repository.result = AppResult.Success(CONFIG)
        viewModel.onEvent(UiAction.OnRetryClicked)
        assertEquals(LaunchGate.Ready, viewModel.state.first { it.gate == LaunchGate.Ready }.gate)
        assertEquals(2, repository.calls)
    }

    @Test
    fun forceUpdateOpensTheConfiguredStore() = runTest(UnconfinedTestDispatcher()) {
        val config = CONFIG.copy(update = UpdatePolicy(UpdateStatus.UPDATE_REQUIRED, storeUrl = STORE_URL))
        val viewModel = viewModel(FakeConfigRepository(AppResult.Success(config)))
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { viewModel.sideEffect.collect { effects += it } }
        assertEquals(LaunchGate.ForceUpdate(STORE_URL), viewModel.state.first { !it.loading }.gate)
        viewModel.onEvent(UiAction.OnUpdateClicked)
        assertEquals(listOf<SideEffect>(SideEffect.OpenStore(STORE_URL)), effects)
    }

    @Test
    fun optionalUpdateCanBeDismissed() = runTest(UnconfinedTestDispatcher()) {
        val config = CONFIG.copy(update = UpdatePolicy(UpdateStatus.UPDATE_AVAILABLE, storeUrl = STORE_URL))
        val viewModel = viewModel(FakeConfigRepository(AppResult.Success(config)))
        assertEquals(LaunchGate.OptionalUpdate(STORE_URL), viewModel.state.first { !it.loading }.gate)
        viewModel.onEvent(UiAction.OnOptionalUpdateDismissed)
        assertEquals(LaunchGate.Ready, viewModel.state.first { it.gate == LaunchGate.Ready }.gate)
    }

    @Test
    fun configErrorShowsRetryOnTheSplash() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel(FakeConfigRepository(AppResult.Error(AppError.NetworkError("offline"))))
        val state = viewModel.state.first { !it.loading }
        assertTrue(state.showSplash)
        assertEquals("failed", state.error)
        viewModel.onEvent(UiAction.OnSessionTimeOut)
        assertEquals(false, sessionTimeOut.sessionEventTimeOut.receive())
        assertEquals(1, settings.sessionCleared)
    }
}

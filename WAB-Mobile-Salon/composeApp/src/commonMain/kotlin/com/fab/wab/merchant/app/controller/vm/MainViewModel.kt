package com.fab.wab.merchant.app.controller.vm

import androidx.lifecycle.viewModelScope
import com.fab.wab.merchant.app.analytics.SessionAnalyticsSync
import com.fab.wab.merchant.app.controller.contract.MainContract.SideEffect
import com.fab.wab.merchant.app.controller.contract.MainContract.UiAction
import com.fab.wab.merchant.app.controller.contract.MainContract.UiState
import com.fab.wab.merchant.app.realtime.RealtimeAccountEvents
import com.fab.wab.merchant.core.common.AppEnvironment
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppLanguage
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.AppSettings
import com.fab.wab.merchant.core.domain.AppearanceSettings
import com.fab.wab.merchant.core.domain.ThemeMode
import com.fab.wab.merchant.core.domain.config.AppConfigRepository
import com.fab.wab.merchant.core.domain.config.LaunchGate
import com.fab.wab.merchant.core.domain.config.launchGateOf
import com.fab.wab.merchant.core.domain.permission.PermissionsSync
import com.fab.wab.merchant.core.domain.repository.SessionTimeOut
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.core.domain.session.SessionState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

private const val STATE_SUBSCRIPTION_MS = 5_000L

/** App shell: launch gate from the config call (PRD M01, M26), appearance flows, analytics user sync, session expiry. */
class MainViewModel(
    private val appConfigRepository: AppConfigRepository,
    private val appSettings: AppSettings,
    appearanceSettings: AppearanceSettings,
    private val sessionTimeOut: SessionTimeOut,
    environment: AppEnvironment,
    sessionAnalyticsSync: SessionAnalyticsSync,
    private val permissionsSync: PermissionsSync,
    accountEvents: RealtimeAccountEvents,
    testScope: CoroutineScope? = null,
    private val errorText: suspend (AppError) -> String = ::appErrorText,
    session: Flow<SessionState> = emptyFlow(),
    private val refreshSalon: suspend () -> Unit = {},
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(appVersion = environment.appVersion), testScope) {

    private var storeUrl: String? = null

    init {
        sessionAnalyticsSync.start(scope)
        // PRD §3: permissions are re-fetched on app start (Home refresh and the PERMISSIONS_UPDATED push call it too).
        scope.launch { permissionsSync.refresh() }
        accountEvents.start(scope) { emitSideEffect(SideEffect.AccessRevoked) }
        loadConfig()
        // PRD §4.3: a member's salon state decides the route; refresh it at launch and right after every sign-in.
        session.map { it.isSignedIn }.distinctUntilChanged().filter { it }.onEach { refreshSalon() }.launchIn(scope)
    }

    override fun handle(event: UiAction) {
        when (event) {
            UiAction.OnUpdateClicked -> emitSideEffect(SideEffect.OpenStore(storeUrl))
            UiAction.OnOptionalUpdateDismissed -> updateState { copy(gate = LaunchGate.Ready) }
            UiAction.OnRetryClicked -> loadConfig()
            UiAction.OnSessionTimeOut -> scope.launch { handleSessionTimeOut() }
        }
    }

    private fun loadConfig() {
        scope.launch {
            updateState { copy(loading = true, error = null) }
            when (val result = appConfigRepository.refresh()) {
                is AppResult.Success -> {
                    storeUrl = result.data.update.storeUrl
                    updateState { copy(loading = false, gate = launchGateOf(result.data), error = null) }
                }
                is AppResult.Error -> {
                    val message = errorText(result.appError)
                    updateState { copy(loading = false, error = message) }
                }
                AppResult.Loading -> Unit
            }
        }
    }

    /** An expired session clears the stored session; the app continues as a guest. */
    private suspend fun handleSessionTimeOut() {
        appSettings.clearSession()
        sessionTimeOut.sendSessionTimeOut(false)
    }

    val languageState = appearanceSettings.language.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(STATE_SUBSCRIPTION_MS),
        AppLanguage.DEFAULT,
    )

    val themeMode = appearanceSettings.themeMode.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(STATE_SUBSCRIPTION_MS),
        ThemeMode.SYSTEM,
    )

    /**
     * The stored session, held by the view model so it survives configuration changes: the shell keys its navigation
     * on the route derived from it, and a fresh `collectAsState(initial = null)` after a rotation answered "guest" for
     * one frame, rebuilt the navigation and dropped the member back on Home (found in the e2e pass). Null = not read yet.
     */
    val sessionState: StateFlow<SessionState?> = session.stateIn(scope, SharingStarted.Eagerly, null)

    val sessionTimeOutState = sessionTimeOut.sessionEventTimeOut.receiveAsFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(), false)
}

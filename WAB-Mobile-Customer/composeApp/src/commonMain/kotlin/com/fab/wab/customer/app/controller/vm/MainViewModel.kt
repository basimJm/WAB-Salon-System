package com.fab.wab.customer.app.controller.vm

import androidx.lifecycle.viewModelScope
import com.fab.wab.customer.app.analytics.SessionAnalyticsSync
import com.fab.wab.customer.app.auth.InstallationSyncer
import com.fab.wab.customer.app.controller.contract.MainContract.SideEffect
import com.fab.wab.customer.app.controller.contract.MainContract.UiAction
import com.fab.wab.customer.app.controller.contract.MainContract.UiState
import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppLanguage
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.AppSettings
import com.fab.wab.customer.core.domain.AppearanceSettings
import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.core.domain.config.AppConfigRepository
import com.fab.wab.customer.core.domain.config.LaunchGate
import com.fab.wab.customer.core.domain.config.launchGateOf
import com.fab.wab.customer.core.domain.repository.SessionTimeOut
import com.fab.wab.customer.core.domain.session.LaunchDestination
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.launchDestinationOf
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

private const val STATE_SUBSCRIPTION_MS = 5_000L

/** App shell: launch gate from the config call (PRD §4.2, S24), appearance flows, session expiry. */
class MainViewModel(
    private val appSettings: AppSettings,
    private val appearanceSettings: AppearanceSettings,
    private val appConfigRepository: AppConfigRepository,
    private val sessionTimeOut: SessionTimeOut,
    private val sessionStore: SessionStore,
    private val environment: AppEnvironment,
    sessionAnalyticsSync: SessionAnalyticsSync,
    installationSyncer: InstallationSyncer,
    private val errorText: suspend (AppError) -> String = ::appErrorText,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(appVersion = environment.appVersion), testScope) {

    private var storeUrl: String? = null

    init {
        sessionAnalyticsSync.start(scope)
        installationSyncer.start(scope)
        loadConfig()
    }

    override fun handle(event: UiAction) {
        when (event) {
            UiAction.OnUpdateClicked -> emitSideEffect(SideEffect.OpenStore(storeUrl))
            UiAction.OnOptionalUpdateDismissed -> updateState { copy(gate = LaunchGate.Ready) }
            UiAction.OnRetryClicked -> loadConfig()
            UiAction.OnOnboardingFinished, UiAction.OnGuestProfileSaved -> scope.launch { route() }
            UiAction.OnSessionTimeOut -> scope.launch { handleSessionTimeOut() }
        }
    }

    private fun loadConfig() {
        scope.launch {
            updateState { copy(loading = true, error = null) }
            when (val result = appConfigRepository.refresh()) {
                is AppResult.Success -> {
                    val gate = launchGateOf(result.data)
                    storeUrl = result.data.update.storeUrl
                    val launch = state.value.launch ?: launchDestination()
                    updateState { copy(loading = false, gate = gate, error = null, launch = launch) }
                }
                is AppResult.Error -> {
                    val message = errorText(result.appError)
                    updateState { copy(loading = false, error = message) }
                }
                AppResult.Loading -> Unit
            }
        }
    }

    /** PRD §4.3: after an expired session the app continues as guest; an incomplete guest profile goes back to S02. */
    private suspend fun handleSessionTimeOut() {
        appSettings.clearSession()
        sessionTimeOut.sendSessionTimeOut(false)
        route()
    }

    private suspend fun route() {
        val destination = launchDestination()
        updateState { copy(launch = destination) }
    }

    private suspend fun launchDestination(): LaunchDestination =
        launchDestinationOf(onboardingSeen = sessionStore.onboardingSeen.first(), session = sessionStore.state.first())

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

    val sessionTimeOutState = sessionTimeOut.sessionEventTimeOut.receiveAsFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(), false)
}

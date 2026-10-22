package com.fab.wab.merchant.app.controller.vm

import androidx.lifecycle.viewModelScope
import com.fab.wab.merchant.app.analytics.SessionAnalyticsSync
import com.fab.wab.merchant.app.controller.contract.MainContract.SideEffect
import com.fab.wab.merchant.app.controller.contract.MainContract.UiAction
import com.fab.wab.merchant.app.controller.contract.MainContract.UiState
import com.fab.wab.merchant.core.common.AppEnvironment
import com.fab.wab.merchant.core.domain.AppLanguage
import com.fab.wab.merchant.core.domain.AppSettings
import com.fab.wab.merchant.core.domain.AppearanceSettings
import com.fab.wab.merchant.core.domain.ThemeMode
import com.fab.wab.merchant.core.domain.repository.SessionTimeOut
import com.fab.wab.merchant.core.mvi.BaseViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

private const val STATE_SUBSCRIPTION_MS = 5_000L

/** App shell: appearance flows (language, theme), analytics user sync and session expiry. */
class MainViewModel(
    private val appSettings: AppSettings,
    appearanceSettings: AppearanceSettings,
    private val sessionTimeOut: SessionTimeOut,
    environment: AppEnvironment,
    sessionAnalyticsSync: SessionAnalyticsSync,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(appVersion = environment.appVersion), testScope) {

    init {
        sessionAnalyticsSync.start(scope)
    }

    override fun handle(event: UiAction) {
        when (event) {
            UiAction.OnSessionTimeOut -> scope.launch { handleSessionTimeOut() }
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

    val sessionTimeOutState = sessionTimeOut.sessionEventTimeOut.receiveAsFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(), false)
}

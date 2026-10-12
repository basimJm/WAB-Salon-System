package com.fab.wab.customer.app.controller.vm

import androidx.lifecycle.viewModelScope
import com.fab.wab.customer.app.controller.contract.MainContract.SideEffect
import com.fab.wab.customer.app.controller.contract.MainContract.UiAction
import com.fab.wab.customer.app.controller.contract.MainContract.UiState
import com.fab.wab.customer.core.common.getAppInfoProvider
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.AppSettings
import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.core.domain.repository.ApplicationSettingsRepository
import com.fab.wab.customer.core.domain.repository.SessionTimeOut
import com.fab.wab.customer.core.ui.mvi.BaseViewModel
import com.fab.wab.customer.core.ui.utils.getDefaultLocale
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class MainViewModel(
    private val appSettings: AppSettings,
    private val applicationSettingsRepository: ApplicationSettingsRepository,
    private val sessionTimeOut: SessionTimeOut
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState()) {

    init {
        scope.launch {
            loadRemoteApplicationSettings()
        }
    }

    private suspend fun handleSessionTimeOut() {
        appSettings.clearSession()
        sessionTimeOut.sendSessionTimeOut(false)
    }

    private suspend fun loadRemoteApplicationSettings() {
        applicationSettingsRepository.applicationSettings().collectLatest { result ->
            when (result) {
                is AppResult.Error -> {
                    updateState {
                        copy(
                            splashScreenState = state.value.splashScreenState.copy(
                                splashErrorMsg = extractErrorMessage(result.appError),
                                showSplashScreen = false
                            )
                        )
                    }
                }

                AppResult.Loading -> Unit

                is AppResult.Success -> {
                    val currentVersion = getAppInfoProvider().appVersion
                    val serverVersion = result.data.appVersion
                    val isNewVersionAvailable = isVersionGreater(serverVersion, currentVersion)

                    val showUpdateDialog = isNewVersionAvailable && result.data.forceUpdate
                    val showOptionalUpdateDialog = isNewVersionAvailable && !result.data.forceUpdate

                    updateState {
                        copy(
                            splashScreenState = state.value.splashScreenState.copy(
                                showUpdateDialog = showUpdateDialog,
                                showOptionalUpdateDialog = showOptionalUpdateDialog,
                                showMaintenanceDialog = result.data.maintenanceMode,
                                appVersion = result.data.appVersion
                            )
                        )
                    }

                    if (!result.data.maintenanceMode && !showUpdateDialog && !showOptionalUpdateDialog) {
                        updateState {
                            copy(
                                splashScreenState = uiState.value.splashScreenState.copy(
                                    showSplashScreen = false
                                )
                            )
                        }
                    }
                }
            }
        }
    }

    private fun isVersionGreater(serverVersion: String, currentVersion: String): Boolean {
        val serverParts = serverVersion.split(".").mapNotNull { it.toIntOrNull() }
        val currentParts = currentVersion.split(".").mapNotNull { it.toIntOrNull() }

        val maxLength = maxOf(serverParts.size, currentParts.size)
        for (i in 0 until maxLength) {
            val serverPart = serverParts.getOrElse(i) { 0 }
            val currentPart = currentParts.getOrElse(i) { 0 }
            if (serverPart > currentPart) return true
            if (serverPart < currentPart) return false
        }
        return false
    }

    override fun onEvent(event: UiAction) {
        scope.launch {
            when (event) {
                UiAction.OnConfirmUpdateDialog -> {
                    updateState {
                        copy(
                            splashScreenState = state.value.splashScreenState.copy(
                                showUpdateDialog = false,
                                showOptionalUpdateDialog = false
                            )
                        )
                    }
                    emitSideEffect(SideEffect.NavigateToStore)
                }

                UiAction.OnDismissUpdateDialog -> {
                    updateState {
                        copy(
                            splashScreenState = state.value.splashScreenState.copy(
                                showOptionalUpdateDialog = false,
                                showSplashScreen = false
                            )
                        )
                    }
                }

                UiAction.OnConfirmMaintenanceDialog -> {
                    updateState {
                        copy(
                            splashScreenState = state.value.splashScreenState.copy(
                                showMaintenanceDialog = false
                            )
                        )
                    }
                    emitSideEffect(SideEffect.KillTheApp)
                }

                UiAction.OnRetryClicked -> {
                    updateState {
                        copy(
                            splashScreenState = state.value.splashScreenState.copy(
                                splashErrorMsg = null
                            )
                        )
                    }
                    loadRemoteApplicationSettings()
                }

                UiAction.OnSessionTimeOut -> handleSessionTimeOut()
            }
        }
    }

    val languageState = appSettings.language.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000L),
        getDefaultLocale()
    )

    val themeMode = appSettings.themeMode.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000L),
        ThemeMode.SYSTEM
    )

    val sessionTimeOutState = sessionTimeOut.sessionEventTimeOut.receiveAsFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(), false)

    private fun extractErrorMessage(error: AppError): String {
        return when (error) {
            is AppError.NetworkError -> error.errorMsg
            is AppError.HttpError -> error.message ?: "Unknown error"
            is AppError.ParseError -> error.message ?: "Unknown error"
            is AppError.UnknownError -> error.errorMsg
        }
    }
}

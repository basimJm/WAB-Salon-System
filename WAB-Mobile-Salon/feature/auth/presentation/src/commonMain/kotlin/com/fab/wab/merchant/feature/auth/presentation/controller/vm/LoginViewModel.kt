package com.fab.wab.merchant.feature.auth.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.common.FormValidators
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.AppearanceSettings
import com.fab.wab.merchant.core.domain.ThemeMode
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.core.domain.locations.defaultCountry
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.auth.domain.model.PhoneCheck
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.auth.domain.usecase.CheckPhoneUseCase
import com.fab.wab.merchant.feature.auth.presentation.analytics.LoginAnalytics
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.LegalSlugs
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.LoginContract.LoginDialog
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.LoginContract.SideEffect
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.LoginContract.UiAction
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.LoginContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class LoginViewModel(
    private val checkPhone: CheckPhoneUseCase,
    private val locations: LocationsRepository,
    private val appearance: AppearanceSettings,
    private val analytics: AnalyticsTracker,
    private val errorText: suspend (AppError) -> String = ::appErrorText,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    override fun onStart() {
        loadCountries()
        scope.launch {
            val mode = appearance.themeMode.first()
            updateState { copy(themeMode = mode) }
        }
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnNumberChange -> updateState { copy(number = event.value, numberTouched = true).revalidated() }
            UiAction.OnCountryClick -> updateState { copy(pickerOpen = true) }
            is UiAction.OnCountrySelect -> updateState {
                copy(country = countries.firstOrNull { it.code == event.code } ?: country, pickerOpen = false).revalidated()
            }
            UiAction.OnPickerDismiss -> updateState { copy(pickerOpen = false) }
            UiAction.OnLoginClick -> submit()
            UiAction.OnRegisterClick -> register()
            UiAction.OnDialogConfirm -> confirmDialog()
            UiAction.OnDialogDismiss -> updateState { copy(dialog = null) }
            UiAction.OnLanguageToggle -> scope.launch { toggleLanguage() }
            UiAction.OnThemeToggle -> scope.launch { toggleTheme() }
            is UiAction.OnLegalClick -> emitSideEffect(SideEffect.OpenContent(event.slug))
            UiAction.OnRetryCountries -> loadCountries()
        }
    }

    private fun UiState.revalidated(): UiState =
        copy(isNumberValid = country != null && FormValidators.isValidPhone(number, country.phoneRegex))

    private fun loadCountries() {
        scope.launch {
            updateState { copy(countriesLoading = true, countriesError = null) }
            when (val result = locations.countries()) {
                is AppResult.Success -> updateState {
                    // One entry per code: lazy lists key countries by it.
                    val unique = result.data.distinctBy { it.code }
                    val selected = unique.firstOrNull { it.code == country?.code } ?: unique.defaultCountry()
                    copy(countries = unique, country = selected, countriesLoading = false).revalidated()
                }
                is AppResult.Error -> {
                    val message = errorText(result.appError)
                    updateState { copy(countriesLoading = false, countriesError = message) }
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun submit() {
        val current = state.value
        val country = current.country ?: return
        if (!current.canSubmit) {
            updateState { copy(numberTouched = true) }
            return
        }
        val phone = PhoneNumber(country.code, FormValidators.normalizeNationalNumber(current.number))
        scope.launch {
            updateState { copy(submitting = true) }
            val result = checkPhone(phone)
            updateState { copy(submitting = false) }
            analytics.trackAction(
                AnalyticsAction(
                    LoginAnalytics.ACTION_LOGIN_START,
                    analyticsParams {
                        text(LoginAnalytics.PARAM_COUNTRY, country.code)
                        text(LoginAnalytics.PARAM_RESULT, resultName(result))
                    },
                ),
            )
            when (result) {
                is AppResult.Success -> when (result.data) {
                    PhoneCheck.REGISTERED -> emitSideEffect(SideEffect.NavigateToOtp(phone))
                    PhoneCheck.NOT_REGISTERED -> updateState { copy(dialog = LoginDialog.NotRegistered) }
                    PhoneCheck.INACTIVE -> updateState { copy(dialog = LoginDialog.Inactive) }
                    PhoneCheck.BLOCKED -> updateState { copy(dialog = LoginDialog.Blocked) }
                }
                is AppResult.Error -> emitSideEffect(SideEffect.ShowError(errorText(result.appError)))
                AppResult.Loading -> Unit
            }
        }
    }

    /** A valid number is needed first: the registration OTP goes to it (PRD M02 register link). */
    private fun register() {
        val current = state.value
        val phone = current.validPhone()
        if (phone == null) {
            updateState { copy(numberTouched = true) }
            return
        }
        analytics.trackAction(AnalyticsAction(LoginAnalytics.ACTION_REGISTER_CLICK))
        emitSideEffect(SideEffect.NavigateToRegister(phone))
    }

    private fun confirmDialog() {
        val current = state.value
        updateState { copy(dialog = null) }
        when (current.dialog) {
            LoginDialog.NotRegistered -> current.validPhone()?.let { emitSideEffect(SideEffect.NavigateToRegister(it)) }
            LoginDialog.Blocked -> emitSideEffect(SideEffect.OpenContent(LegalSlugs.CONTACT))
            LoginDialog.Inactive, null -> Unit
        }
    }

    private fun UiState.validPhone(): PhoneNumber? {
        val selected = country ?: return null
        return if (isNumberValid) PhoneNumber(selected.code, FormValidators.normalizeNationalNumber(number)) else null
    }

    private suspend fun toggleLanguage() {
        val next = appearance.toggleLanguage()
        val params = analyticsParams { text(LoginAnalytics.PARAM_LANGUAGE, next.code) }
        analytics.trackAction(AnalyticsAction(LoginAnalytics.ACTION_LANGUAGE_CHANGE, params))
        loadCountries()
    }

    private suspend fun toggleTheme() {
        val next = if (state.value.themeMode == ThemeMode.DARK) ThemeMode.LIGHT else ThemeMode.DARK
        appearance.setThemeMode(next)
        updateState { copy(themeMode = next) }
        val params = analyticsParams { text(LoginAnalytics.PARAM_THEME, next.name.lowercase()) }
        analytics.trackAction(AnalyticsAction(LoginAnalytics.ACTION_THEME_CHANGE, params))
    }

    private fun resultName(result: AppResult<PhoneCheck>): String = when (result) {
        is AppResult.Success -> result.data.name.lowercase()
        is AppResult.Error -> RESULT_ERROR
        AppResult.Loading -> RESULT_ERROR
    }

    private companion object {
        const val RESULT_ERROR = "error"
    }
}

package com.fab.wab.customer.feature.auth.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.common.FormValidators
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.AppearanceSettings
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.core.domain.locations.LocationsRepository
import com.fab.wab.customer.core.domain.locations.defaultCountry
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.OtpVerified
import com.fab.wab.customer.feature.auth.domain.model.PhoneCheck
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.model.RegisterRequest
import com.fab.wab.customer.feature.auth.domain.repository.PendingOtpVerification
import com.fab.wab.customer.feature.auth.domain.usecase.CheckPhoneUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.RegisterUseCase
import com.fab.wab.customer.feature.auth.presentation.analytics.LoginAnalytics
import com.fab.wab.customer.feature.auth.presentation.analytics.RegisterAnalytics
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract.RegisterField
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract.SideEffect
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract.UiAction
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/** Collaborators of S12. */
class RegisterDependencies(
    val checkPhone: CheckPhoneUseCase,
    val register: RegisterUseCase,
    val locations: LocationsRepository,
    val sessionStore: SessionStore,
    val appearance: AppearanceSettings,
    val pending: PendingOtpVerification,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** Register (PRD S12): prefilled from the guest profile and the login number, city → area, OTP, then the account. */
class RegisterViewModel(
    private val prefill: PhoneNumber?,
    private val deps: RegisterDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private var started = false

    override fun onStart() {
        if (started) return
        started = true
        scope.launch { prefillFromGuest() }
        scope.launch { loadReferenceData() }
        scope.launch {
            val mode = deps.appearance.themeMode.first()
            updateState { copy(themeMode = mode) }
        }
        scope.launch { awaitProof() }
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnFirstNameChange, is UiAction.OnLastNameChange, is UiAction.OnEmailChange, is UiAction.OnNumberChange ->
                onTextChange(event)
            is UiAction.OnGenderSelect, is UiAction.OnCitySelect, is UiAction.OnAreaSelect, is UiAction.OnCountrySelect ->
                onSelection(event)
            UiAction.OnCountryClick -> updateState { copy(pickerOpen = true) }
            UiAction.OnPickerDismiss -> updateState { copy(pickerOpen = false) }
            UiAction.OnRegisterClick -> submit()
            UiAction.OnLoginClick -> {
                deps.analytics.trackAction(AnalyticsAction(RegisterAnalytics.ACTION_LOGIN_CLICK))
                emitSideEffect(SideEffect.NavigateToLogin)
            }
            is UiAction.OnLegalClick -> emitSideEffect(SideEffect.OpenContent(event.slug))
            UiAction.OnLanguageToggle -> scope.launch { toggleLanguage() }
            UiAction.OnThemeToggle -> scope.launch { toggleTheme() }
            UiAction.OnRetryLoad -> scope.launch { loadReferenceData() }
        }
    }

    private fun onTextChange(event: UiAction) {
        when (event) {
            is UiAction.OnFirstNameChange -> updateState { copy(firstName = event.value, touched = touched + RegisterField.FirstName) }
            is UiAction.OnLastNameChange -> updateState { copy(lastName = event.value, touched = touched + RegisterField.LastName) }
            is UiAction.OnEmailChange -> updateState { copy(email = event.value, touched = touched + RegisterField.Email) }
            is UiAction.OnNumberChange -> updateState { copy(number = event.value, touched = touched + RegisterField.Phone).revalidated() }
            else -> Unit
        }
    }

    private fun onSelection(event: UiAction) {
        when (event) {
            is UiAction.OnGenderSelect -> updateState { copy(gender = event.gender, touched = touched + RegisterField.Gender) }
            is UiAction.OnCitySelect -> selectCity(event.cityId)
            is UiAction.OnAreaSelect -> updateState { copy(areaId = event.areaId, touched = touched + RegisterField.Area) }
            is UiAction.OnCountrySelect -> updateState {
                copy(country = countries.firstOrNull { it.code == event.code } ?: country, pickerOpen = false).revalidated()
            }
            else -> Unit
        }
    }

    private fun UiState.revalidated(): UiState =
        copy(isNumberValid = country != null && FormValidators.isValidPhone(number, country.phoneRegex))

    private suspend fun prefillFromGuest() {
        val guest = (deps.sessionStore.state.first() as? SessionState.Guest)?.profile ?: return
        updateState { copy(firstName = guest.nickname.orEmpty(), gender = guest.gender) }
    }

    private suspend fun loadReferenceData() {
        updateState { copy(citiesLoading = true, loadError = null) }
        val countries = deps.locations.countries()
        val cities = deps.locations.cities(DEFAULT_COUNTRY_FOR_CITIES)
        val error = (countries as? AppResult.Error)?.appError ?: (cities as? AppResult.Error)?.appError
        if (error != null) {
            val message = deps.errorText(error)
            updateState { copy(citiesLoading = false, loadError = message) }
            return
        }
        val countryList = (countries as AppResult.Success).data.distinctBy { it.code }
        val selected = countryList.firstOrNull { it.code == prefill?.countryCode } ?: countryList.defaultCountry()
        updateState {
            copy(
                countries = countryList,
                country = selected,
                number = if (number.isEmpty()) prefill?.number.orEmpty() else number,
                cities = (cities as AppResult.Success).data,
                citiesLoading = false,
            ).revalidated()
        }
    }

    private fun selectCity(cityId: String) {
        updateState {
            copy(cityId = cityId, areaId = null, areas = emptyList(), areasLoading = true, touched = touched + RegisterField.City)
        }
        scope.launch {
            when (val result = deps.locations.areas(cityId)) {
                is AppResult.Success -> updateState { copy(areas = result.data, areasLoading = false) }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    updateState { copy(areasLoading = false) }
                    emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun submit() {
        val current = state.value
        updateState { copy(submitted = true) }
        val country = current.country ?: return
        if (!current.canSubmit) return
        val phone = PhoneNumber(country.code, FormValidators.normalizeNationalNumber(current.number))
        scope.launch {
            updateState { copy(submitting = true) }
            val check = deps.checkPhone(phone, AuthPurpose.REGISTER)
            track(RegisterAnalytics.ACTION_SUBMIT, resultName(check))
            updateState { copy(submitting = false) }
            when (check) {
                is AppResult.Success -> when (check.data) {
                    PhoneCheck.NOT_REGISTERED, PhoneCheck.REGISTERED -> emitSideEffect(SideEffect.NavigateToOtp(phone))
                    PhoneCheck.ALREADY_REGISTERED, PhoneCheck.BLOCKED ->
                        emitSideEffect(SideEffect.ShowError(deps.errorText(errorFor(check.data))))
                }
                is AppResult.Error -> emitSideEffect(SideEffect.ShowError(deps.errorText(check.appError)))
                AppResult.Loading -> Unit
            }
        }
    }

    /** The OTP screen publishes the proof and pops back; registration completes here. */
    private suspend fun awaitProof() {
        deps.pending.current.filterNotNull().collect { proof ->
            if (proof.purpose != AuthPurpose.REGISTER) return@collect
            deps.pending.consume()
            register(proof)
        }
    }

    private suspend fun register(proof: OtpVerified) {
        val current = state.value
        val request = RegisterRequest(
            firstName = current.firstName.trim(),
            lastName = current.lastName.trim(),
            email = current.email.trim(),
            gender = current.gender ?: return,
            cityId = current.cityId ?: return,
            areaId = current.areaId ?: return,
            phone = proof.phone,
            idToken = proof.idToken,
        )
        updateState { copy(submitting = true) }
        val result = deps.register(request)
        updateState { copy(submitting = false) }
        when (result) {
            is AppResult.Success -> {
                track(RegisterAnalytics.ACTION_COMPLETE, RESULT_OK)
                emitSideEffect(SideEffect.NavigateHome)
            }
            is AppResult.Error -> emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
            AppResult.Loading -> Unit
        }
    }

    private suspend fun toggleLanguage() {
        val next = deps.appearance.toggleLanguage()
        deps.analytics.trackAction(
            AnalyticsAction(LoginAnalytics.ACTION_LANGUAGE_CHANGE, analyticsParams { text(LoginAnalytics.PARAM_LANGUAGE, next.code) }),
        )
        loadReferenceData()
    }

    private suspend fun toggleTheme() {
        val next = if (state.value.themeMode == ThemeMode.DARK) ThemeMode.LIGHT else ThemeMode.DARK
        deps.appearance.setThemeMode(next)
        updateState { copy(themeMode = next) }
        val params = analyticsParams { text(LoginAnalytics.PARAM_THEME, next.name.lowercase()) }
        deps.analytics.trackAction(AnalyticsAction(LoginAnalytics.ACTION_THEME_CHANGE, params))
    }

    private fun track(name: String, result: String) {
        val current = state.value
        deps.analytics.trackAction(
            AnalyticsAction(
                name,
                analyticsParams {
                    current.gender?.let { text(RegisterAnalytics.PARAM_GENDER, it.code.lowercase()) }
                    current.cityId?.let { text(RegisterAnalytics.PARAM_CITY_ID, it) }
                    text(RegisterAnalytics.PARAM_RESULT, result)
                },
            ),
        )
    }

    private fun resultName(result: AppResult<PhoneCheck>): String = when (result) {
        is AppResult.Success -> result.data.name.lowercase()
        else -> RESULT_ERROR
    }

    private fun errorFor(check: PhoneCheck): AppError = AppError.ServerError(
        code = if (check == PhoneCheck.BLOCKED) ErrorCode.ACCOUNT_BLOCKED else ErrorCode.PHONE_ALREADY_REGISTERED,
        statusCode = 0,
        message = null,
    )

    private companion object {
        const val RESULT_OK = "ok"
        const val RESULT_ERROR = "error"

        /** Cities are listed for Jordan (PRD §1: the product serves Jordan) regardless of the phone's country. */
        const val DEFAULT_COUNTRY_FOR_CITIES = "JO"
    }
}

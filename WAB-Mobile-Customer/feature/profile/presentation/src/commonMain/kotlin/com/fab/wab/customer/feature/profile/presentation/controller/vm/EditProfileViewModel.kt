package com.fab.wab.customer.feature.profile.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.common.FormValidators
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.locations.Area
import com.fab.wab.customer.core.domain.locations.City
import com.fab.wab.customer.core.domain.locations.Country
import com.fab.wab.customer.core.domain.locations.LocationsRepository
import com.fab.wab.customer.core.domain.locations.defaultCountry
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.OtpVerified
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.repository.PendingOtpVerification
import com.fab.wab.customer.feature.auth.domain.usecase.ChangePhoneUseCase
import com.fab.wab.customer.feature.profile.domain.model.CustomerAccount
import com.fab.wab.customer.feature.profile.domain.model.ProfileUpdate
import com.fab.wab.customer.feature.profile.domain.usecase.LoadProfileUseCase
import com.fab.wab.customer.feature.profile.domain.usecase.UpdateProfileUseCase
import com.fab.wab.customer.feature.profile.presentation.analytics.ProfileAnalytics
import com.fab.wab.customer.feature.profile.presentation.controller.contract.EditProfileContract.Field
import com.fab.wab.customer.feature.profile.presentation.controller.contract.EditProfileContract.SideEffect
import com.fab.wab.customer.feature.profile.presentation.controller.contract.EditProfileContract.UiAction
import com.fab.wab.customer.feature.profile.presentation.controller.contract.EditProfileContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.launch

class EditProfileDependencies(
    val loadProfile: LoadProfileUseCase,
    val updateProfile: UpdateProfileUseCase,
    val changePhone: ChangePhoneUseCase,
    val locations: LocationsRepository,
    val pending: PendingOtpVerification,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** S22 (CUS-054): prefilled S12 form; phone unchanged → `PATCH /profile`; changed → OTP (CHANGE_PHONE) → change phone → save. */
class EditProfileViewModel(
    private val deps: EditProfileDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private var started = false

    override fun onStart() {
        if (started) return
        started = true
        scope.launch { load() }
        scope.launch { awaitProof() }
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnFirstNameChange -> updateState { copy(firstName = event.value, touched = touched + Field.FirstName) }
            is UiAction.OnLastNameChange -> updateState { copy(lastName = event.value, touched = touched + Field.LastName) }
            is UiAction.OnEmailChange -> updateState { copy(email = event.value, touched = touched + Field.Email) }
            is UiAction.OnGenderSelect -> updateState { copy(gender = event.gender, touched = touched + Field.Gender) }
            is UiAction.OnCitySelect -> selectCity(event.cityId)
            is UiAction.OnAreaSelect -> updateState { copy(areaId = event.areaId, touched = touched + Field.Area) }
            is UiAction.OnNumberChange -> updateState { copy(number = event.value, touched = touched + Field.Phone).revalidated() }
            UiAction.OnCountryClick -> updateState { copy(pickerOpen = true) }
            is UiAction.OnCountrySelect -> updateState {
                copy(country = countries.firstOrNull { it.code == event.code } ?: country, pickerOpen = false).revalidated()
            }
            UiAction.OnPickerDismiss -> updateState { copy(pickerOpen = false) }
            UiAction.OnSaveClick -> save()
            UiAction.OnRetryLoad -> scope.launch { load() }
        }
    }

    private fun UiState.revalidated(): UiState =
        copy(isNumberValid = country != null && FormValidators.isValidPhone(number, country.phoneRegex))

    private suspend fun load() {
        updateState { copy(loading = true, loadError = null) }
        val account = deps.loadProfile()
        val countries = deps.locations.countries()
        val cities = deps.locations.cities(DEFAULT_COUNTRY_FOR_CITIES)
        val error = listOf(account, countries, cities).firstNotNullOfOrNull { (it as? AppResult.Error)?.appError }
        if (error != null || account !is AppResult.Success || countries !is AppResult.Success || cities !is AppResult.Success) {
            val message = deps.errorText(error ?: AppError.UnknownError(""))
            updateState { copy(loading = false, loadError = message) }
            return
        }
        val areas = deps.locations.areas(account.data.cityId)
        prefill(account.data, countries.data.distinctBy { it.code }, cities.data, (areas as? AppResult.Success)?.data.orEmpty())
    }

    private fun prefill(account: CustomerAccount, countries: List<Country>, cities: List<City>, areas: List<Area>) {
        val country = countries.firstOrNull { it.code == account.phoneCountryCode } ?: countries.defaultCountry()
        updateState {
            copy(
                loading = false,
                firstName = account.firstName,
                lastName = account.lastName,
                email = account.email,
                gender = account.gender,
                cities = cities,
                cityId = account.cityId,
                areas = areas,
                areaId = account.areaId.takeIf { id -> areas.any { it.id == id } },
                countries = countries,
                country = country,
                number = account.phoneNumber,
                originalPhone = PhoneNumber(account.phoneCountryCode, account.phoneNumber),
            ).revalidated()
        }
    }

    private fun selectCity(cityId: String) {
        updateState { copy(cityId = cityId, areaId = null, areas = emptyList(), areasLoading = true, touched = touched + Field.City) }
        scope.launch {
            when (val result = deps.locations.areas(cityId)) {
                is AppResult.Success -> updateState { copy(areas = result.data, areasLoading = false) }
                is AppResult.Error -> {
                    updateState { copy(areasLoading = false) }
                    emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun save() {
        val current = uiState.value
        updateState { copy(submitted = true) }
        if (!current.canSave) return
        val phone = current.currentPhone ?: return
        if (current.phoneChanged) {
            track(ProfileAnalytics.ACTION_EDIT_PHONE)
            emitSideEffect(SideEffect.NavigateToOtp(PhoneNumber(phone.countryCode, FormValidators.normalizeNationalNumber(current.number))))
        } else {
            scope.launch { patch() }
        }
    }

    /** The OTP screen publishes the proof and pops back; the phone is changed first, then the rest is saved. */
    private suspend fun awaitProof() {
        deps.pending.current.filterNotNull().collect { proof ->
            if (proof.purpose != AuthPurpose.CHANGE_PHONE) return@collect
            deps.pending.consume()
            changePhone(proof)
        }
    }

    private suspend fun changePhone(proof: OtpVerified) {
        updateState { copy(saving = true) }
        when (val result = deps.changePhone(proof)) {
            is AppResult.Success -> {
                updateState { copy(originalPhone = proof.phone) }
                patch()
            }
            is AppResult.Error -> {
                updateState { copy(saving = false) }
                emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
            }
            AppResult.Loading -> Unit
        }
    }

    private suspend fun patch() {
        val current = uiState.value
        val gender: Gender = current.gender ?: return
        val update = ProfileUpdate(
            firstName = current.firstName.trim(),
            lastName = current.lastName.trim(),
            email = current.email.trim(),
            gender = gender,
            cityId = current.cityId ?: return,
            areaId = current.areaId ?: return,
        )
        updateState { copy(saving = true) }
        val result = deps.updateProfile(update)
        updateState { copy(saving = false) }
        when (result) {
            is AppResult.Success -> {
                track(ProfileAnalytics.ACTION_EDIT_SAVE)
                emitSideEffect(SideEffect.Saved)
            }
            is AppResult.Error -> emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
            AppResult.Loading -> Unit
        }
    }

    private fun track(action: String) {
        deps.analytics.trackAction(AnalyticsAction(action, analyticsParams { }))
    }

    private companion object {
        /** Cities are Jordan-only in Phase 1 (PRD §1). */
        const val DEFAULT_COUNTRY_FOR_CITIES = "JO"
    }
}

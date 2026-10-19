package com.fab.wab.customer.feature.profile.presentation.controller.contract

import com.fab.wab.customer.core.common.FormValidators
import com.fab.wab.customer.core.domain.locations.Area
import com.fab.wab.customer.core.domain.locations.City
import com.fab.wab.customer.core.domain.locations.Country
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber

/** S22: the S12 form prefilled with the account; a changed phone goes through OTP (CHANGE_PHONE) before saving. */
sealed interface EditProfileContract {

    enum class Field { FirstName, LastName, Email, Gender, City, Area, Phone }

    data class UiState(
        val loading: Boolean = true,
        val loadError: String? = null,
        val firstName: String = "",
        val lastName: String = "",
        val email: String = "",
        val gender: Gender? = null,
        val cities: List<City> = emptyList(),
        val cityId: String? = null,
        val areas: List<Area> = emptyList(),
        val areaId: String? = null,
        val areasLoading: Boolean = false,
        val countries: List<Country> = emptyList(),
        val country: Country? = null,
        val number: String = "",
        val isNumberValid: Boolean = false,
        val originalPhone: PhoneNumber? = null,
        val touched: Set<Field> = emptySet(),
        val submitted: Boolean = false,
        val pickerOpen: Boolean = false,
        val saving: Boolean = false,
    ) {
        val firstNameValid: Boolean get() = firstName.isNotBlank()
        val lastNameValid: Boolean get() = lastName.isNotBlank()
        val emailValid: Boolean get() = EMAIL_PATTERN.matches(email.trim())
        val areaEnabled: Boolean get() = cityId != null && !areasLoading
        val isValid: Boolean
            get() = firstNameValid && lastNameValid && emailValid && gender != null && cityId != null && areaId != null &&
                isNumberValid && country != null
        val canSave: Boolean get() = isValid && !saving && !loading
        /** PRD S22: a different number means an OTP to the new number before the save. */
        val phoneChanged: Boolean get() = currentPhone != null && currentPhone != originalPhone
        val currentPhone: PhoneNumber? get() = country?.let { PhoneNumber(it.code, FormValidators.normalizeNationalNumber(number)) }

        fun showError(field: Field): Boolean = (submitted || field in touched) && !fieldValid(field)

        private fun fieldValid(field: Field): Boolean = when (field) {
            Field.FirstName -> firstNameValid
            Field.LastName -> lastNameValid
            Field.Email -> emailValid
            Field.Gender -> gender != null
            Field.City -> cityId != null
            Field.Area -> areaId != null
            Field.Phone -> isNumberValid
        }
    }

    sealed interface UiAction {
        data class OnFirstNameChange(val value: String) : UiAction
        data class OnLastNameChange(val value: String) : UiAction
        data class OnEmailChange(val value: String) : UiAction
        data class OnGenderSelect(val gender: Gender) : UiAction
        data class OnCitySelect(val cityId: String) : UiAction
        data class OnAreaSelect(val areaId: String) : UiAction
        data class OnNumberChange(val value: String) : UiAction
        data object OnCountryClick : UiAction
        data class OnCountrySelect(val code: String) : UiAction
        data object OnPickerDismiss : UiAction
        data object OnSaveClick : UiAction
        data object OnRetryLoad : UiAction
    }

    sealed interface SideEffect {
        data class NavigateToOtp(val phone: PhoneNumber) : SideEffect
        data object Saved : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}

/** The contract's email rule (`openapi.customer.json`): something@something.something, no spaces. */
private val EMAIL_PATTERN = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

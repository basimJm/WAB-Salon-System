package com.fab.wab.customer.feature.auth.presentation.controller.contract

import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.core.domain.locations.Area
import com.fab.wab.customer.core.domain.locations.City
import com.fab.wab.customer.core.domain.locations.Country
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber

sealed interface RegisterContract {
    /** S12: all fields required (PRD §11); errors show once a field was touched or the form was submitted. */
    data class UiState(
        val firstName: String = "",
        val lastName: String = "",
        val email: String = "",
        val gender: Gender? = null,
        val cities: List<City> = emptyList(),
        val cityId: String? = null,
        val areas: List<Area> = emptyList(),
        val areaId: String? = null,
        val countries: List<Country> = emptyList(),
        val country: Country? = null,
        val number: String = "",
        val isNumberValid: Boolean = false,
        val touched: Set<RegisterField> = emptySet(),
        val submitted: Boolean = false,
        val citiesLoading: Boolean = true,
        val areasLoading: Boolean = false,
        val loadError: String? = null,
        val pickerOpen: Boolean = false,
        val submitting: Boolean = false,
        val themeMode: ThemeMode = ThemeMode.SYSTEM,
    ) {
        val firstNameValid: Boolean get() = firstName.isNotBlank()
        val lastNameValid: Boolean get() = lastName.isNotBlank()
        val emailValid: Boolean get() = EMAIL_PATTERN.matches(email.trim())
        val areaEnabled: Boolean get() = cityId != null && !areasLoading
        val isValid: Boolean
            get() = firstNameValid && lastNameValid && emailValid && gender != null && cityId != null && areaId != null &&
                isNumberValid && country != null
        val canSubmit: Boolean get() = isValid && !submitting

        fun showError(field: RegisterField): Boolean = (submitted || field in touched) && !fieldValid(field)

        private fun fieldValid(field: RegisterField): Boolean = when (field) {
            RegisterField.FirstName -> firstNameValid
            RegisterField.LastName -> lastNameValid
            RegisterField.Email -> emailValid
            RegisterField.Gender -> gender != null
            RegisterField.City -> cityId != null
            RegisterField.Area -> areaId != null
            RegisterField.Phone -> isNumberValid
        }
    }

    enum class RegisterField { FirstName, LastName, Email, Gender, City, Area, Phone }

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
        data object OnRegisterClick : UiAction
        data object OnLoginClick : UiAction
        data class OnLegalClick(val slug: String) : UiAction
        data object OnLanguageToggle : UiAction
        data object OnThemeToggle : UiAction
        data object OnRetryLoad : UiAction
    }

    sealed interface SideEffect {
        data class NavigateToOtp(val phone: PhoneNumber) : SideEffect
        data object NavigateHome : SideEffect
        data object NavigateToLogin : SideEffect
        data class OpenContent(val slug: String) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}

/** The contract's email rule (`openapi.customer.json`): something@something.something, no spaces. */
private val EMAIL_PATTERN = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

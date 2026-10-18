package com.fab.wab.customer.feature.auth.presentation.controller.contract

import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.core.domain.locations.Country
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber

sealed interface LoginContract {
    /** PRD S11 states: empty (disabled), valid (enabled), invalid (error under the field), loading (spinner). */
    data class UiState(
        val countries: List<Country> = emptyList(),
        val country: Country? = null,
        val number: String = "",
        val numberTouched: Boolean = false,
        val isNumberValid: Boolean = false,
        val countriesLoading: Boolean = true,
        val countriesError: String? = null,
        val pickerOpen: Boolean = false,
        val submitting: Boolean = false,
        val dialog: LoginDialog? = null,
        val themeMode: ThemeMode = ThemeMode.SYSTEM,
    ) {
        val showNumberError: Boolean get() = numberTouched && number.isNotBlank() && !isNumberValid
        val canSubmit: Boolean get() = isNumberValid && country != null && !submitting
    }

    enum class LoginDialog { NotRegistered, Blocked }

    sealed interface UiAction {
        data class OnNumberChange(val value: String) : UiAction
        data object OnCountryClick : UiAction
        data class OnCountrySelect(val code: String) : UiAction
        data object OnPickerDismiss : UiAction
        data object OnLoginClick : UiAction
        data object OnRegisterClick : UiAction
        data object OnDialogConfirm : UiAction
        data object OnDialogDismiss : UiAction
        data object OnLanguageToggle : UiAction
        data object OnThemeToggle : UiAction
        data class OnLegalClick(val slug: String) : UiAction
        data object OnRetryCountries : UiAction
    }

    sealed interface SideEffect {
        data class NavigateToOtp(val phone: PhoneNumber) : SideEffect
        data class NavigateToRegister(val phone: PhoneNumber?) : SideEffect
        data class OpenContent(val slug: String) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}

/** S23 slugs the login footer links to (`GET /content/pages/{slug}`). */
object LegalSlugs {
    const val PRIVACY = "privacy"
    const val TERMS = "terms"
    const val CONTACT = "contact"
}

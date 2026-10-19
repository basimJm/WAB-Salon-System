package com.fab.wab.customer.feature.auth.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.designsystem.components.form.AppKeyboards
import com.fab.wab.customer.designsystem.components.form.AppPhoneField
import com.fab.wab.customer.designsystem.components.textfield.AppDropdownField
import com.fab.wab.customer.designsystem.components.textfield.AppTextField
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract.RegisterField
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract.UiAction
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract.UiState
import com.fab.wab.customer.feature.auth.presentation.resources.Res
import com.fab.wab.customer.feature.auth.presentation.resources.guest_gender_man_option
import com.fab.wab.customer.feature.auth.presentation.resources.guest_gender_woman_option
import com.fab.wab.customer.feature.auth.presentation.resources.login_phone_error
import com.fab.wab.customer.feature.auth.presentation.resources.login_phone_label
import com.fab.wab.customer.feature.auth.presentation.resources.register_area
import com.fab.wab.customer.feature.auth.presentation.resources.register_area_hint
import com.fab.wab.customer.feature.auth.presentation.resources.register_choose
import com.fab.wab.customer.feature.auth.presentation.resources.register_city
import com.fab.wab.customer.feature.auth.presentation.resources.register_email
import com.fab.wab.customer.feature.auth.presentation.resources.register_email_error
import com.fab.wab.customer.feature.auth.presentation.resources.register_first_name
import com.fab.wab.customer.feature.auth.presentation.resources.register_gender
import com.fab.wab.customer.feature.auth.presentation.resources.register_last_name
import com.fab.wab.customer.feature.auth.presentation.resources.register_required
import org.jetbrains.compose.resources.stringResource

private val GENDER_OPTIONS = listOf(Gender.MALE, Gender.FEMALE)

/** The seven required fields of S12 in PRD order; every error text comes from resources. */
@Composable
internal fun RegisterForm(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val required = stringResource(Res.string.register_required)
    val genderLabels = listOf(stringResource(Res.string.guest_gender_man_option), stringResource(Res.string.guest_gender_woman_option))
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12)) {
        AppTextField(
            value = state.firstName,
            onValueChange = { onAction(UiAction.OnFirstNameChange(it)) },
            label = stringResource(Res.string.register_first_name),
            error = required.takeIf { state.showError(RegisterField.FirstName) },
            keyboardOptions = AppKeyboards.name,
        )
        AppTextField(
            value = state.lastName,
            onValueChange = { onAction(UiAction.OnLastNameChange(it)) },
            label = stringResource(Res.string.register_last_name),
            error = required.takeIf { state.showError(RegisterField.LastName) },
            keyboardOptions = AppKeyboards.name,
        )
        AppTextField(
            value = state.email,
            onValueChange = { onAction(UiAction.OnEmailChange(it)) },
            label = stringResource(Res.string.register_email),
            error = when {
                !state.showError(RegisterField.Email) -> null
                state.email.isBlank() -> required
                else -> stringResource(Res.string.register_email_error)
            },
            keyboardOptions = AppKeyboards.email,
        )
        AppDropdownField(
            options = genderLabels,
            selectedIndex = state.gender?.let { GENDER_OPTIONS.indexOf(it) }?.takeIf { it >= 0 },
            onSelect = { onAction(UiAction.OnGenderSelect(GENDER_OPTIONS[it])) },
            placeholder = stringResource(Res.string.register_choose),
            label = stringResource(Res.string.register_gender),
            error = required.takeIf { state.showError(RegisterField.Gender) },
        )
        AppDropdownField(
            options = state.cities.map { it.name },
            selectedIndex = state.cities.indexOfFirst { it.id == state.cityId }.takeIf { it >= 0 },
            onSelect = { onAction(UiAction.OnCitySelect(state.cities[it].id)) },
            placeholder = stringResource(Res.string.register_choose),
            label = stringResource(Res.string.register_city),
            error = required.takeIf { state.showError(RegisterField.City) },
            enabled = !state.citiesLoading,
        )
        AppDropdownField(
            options = state.areas.map { it.name },
            selectedIndex = state.areas.indexOfFirst { it.id == state.areaId }.takeIf { it >= 0 },
            onSelect = { onAction(UiAction.OnAreaSelect(state.areas[it].id)) },
            placeholder = stringResource(if (state.cityId == null) Res.string.register_area_hint else Res.string.register_choose),
            label = stringResource(Res.string.register_area),
            error = required.takeIf { state.showError(RegisterField.Area) },
            enabled = state.areaEnabled,
        )
        AppPhoneField(
            value = state.number,
            onValueChange = { onAction(UiAction.OnNumberChange(it)) },
            country = state.country?.toUi(),
            onCountryClick = { onAction(UiAction.OnCountryClick) },
            label = stringResource(Res.string.login_phone_label),
            error = stringResource(Res.string.login_phone_error).takeIf { state.showError(RegisterField.Phone) },
            enabled = !state.citiesLoading,
        )
    }
}

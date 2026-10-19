package com.fab.wab.customer.feature.auth.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextDirection
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.form.AppKeyboards
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract.RegisterField
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract.UiAction
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract.UiState
import com.fab.wab.customer.feature.auth.presentation.resources.Res
import com.fab.wab.customer.feature.auth.presentation.resources.guest_gender_man_option
import com.fab.wab.customer.feature.auth.presentation.resources.guest_gender_woman_option
import com.fab.wab.customer.feature.auth.presentation.resources.login_phone_error
import com.fab.wab.customer.feature.auth.presentation.resources.login_phone_label
import com.fab.wab.customer.feature.auth.presentation.resources.login_phone_placeholder
import com.fab.wab.customer.feature.auth.presentation.resources.register_area
import com.fab.wab.customer.feature.auth.presentation.resources.register_area_hint
import com.fab.wab.customer.feature.auth.presentation.resources.register_button
import com.fab.wab.customer.feature.auth.presentation.resources.register_choose
import com.fab.wab.customer.feature.auth.presentation.resources.register_city
import com.fab.wab.customer.feature.auth.presentation.resources.register_email
import com.fab.wab.customer.feature.auth.presentation.resources.register_email_error
import com.fab.wab.customer.feature.auth.presentation.resources.register_email_placeholder
import com.fab.wab.customer.feature.auth.presentation.resources.register_first_name
import com.fab.wab.customer.feature.auth.presentation.resources.register_gender
import com.fab.wab.customer.feature.auth.presentation.resources.register_last_name
import com.fab.wab.customer.feature.auth.presentation.resources.register_required
import org.jetbrains.compose.resources.stringResource

private val GENDER_OPTIONS = listOf(Gender.MALE, Gender.FEMALE)

/**
 * The S12 card content in design order: first + last name side by side (gap 10), email (LTR), gender, city, area
 * dropdowns, phone, and the Register button; every block = accent label 12, field 52, danger error 11.5 (gap 14).
 */
@Composable
internal fun RegisterForm(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val required = stringResource(Res.string.register_required)
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(AuthDesign.registerCardGap)) {
        NameRow(state, onAction, required)
        AuthFieldBlock(
            label = stringResource(Res.string.register_email),
            error = when {
                !state.showError(RegisterField.Email) -> null
                state.email.isBlank() -> required
                else -> stringResource(Res.string.register_email_error)
            },
            compact = true,
        ) {
            AuthTextField(
                value = state.email,
                onValueChange = { onAction(UiAction.OnEmailChange(it)) },
                error = state.showError(RegisterField.Email),
                keyboardOptions = AppKeyboards.email,
                placeholder = stringResource(Res.string.register_email_placeholder),
                textDirection = TextDirection.Ltr,
            )
        }
        Dropdowns(state, onAction, required)
        AuthFieldBlock(
            label = stringResource(Res.string.login_phone_label),
            error = stringResource(Res.string.login_phone_error).takeIf { state.showError(RegisterField.Phone) },
            compact = true,
        ) {
            AuthPhoneField(
                value = state.number,
                onValueChange = { onAction(UiAction.OnNumberChange(it)) },
                country = state.country?.toUi(),
                onCountryClick = { onAction(UiAction.OnCountryClick) },
                placeholder = stringResource(Res.string.login_phone_placeholder),
                error = state.showError(RegisterField.Phone),
                enabled = !state.citiesLoading,
                showChevron = false,
            )
        }
        AppPrimaryButton(
            text = stringResource(Res.string.register_button),
            onClick = { onAction(UiAction.OnRegisterClick) },
            modifier = Modifier.fillMaxWidth(),
            enabled = state.canSubmit,
            loading = state.submitting,
        )
    }
}

@Composable
private fun NameRow(state: UiState, onAction: (UiAction) -> Unit, required: String, modifier: Modifier = Modifier) {
    Row(modifier = modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(AuthDesign.nameGap)) {
        AuthFieldBlock(
            label = stringResource(Res.string.register_first_name),
            error = required.takeIf { state.showError(RegisterField.FirstName) },
            modifier = Modifier.weight(1f),
            compact = true,
        ) {
            AuthTextField(
                value = state.firstName,
                onValueChange = { onAction(UiAction.OnFirstNameChange(it)) },
                error = state.showError(RegisterField.FirstName),
                keyboardOptions = AppKeyboards.name,
            )
        }
        AuthFieldBlock(
            label = stringResource(Res.string.register_last_name),
            error = required.takeIf { state.showError(RegisterField.LastName) },
            modifier = Modifier.weight(1f),
            compact = true,
        ) {
            AuthTextField(
                value = state.lastName,
                onValueChange = { onAction(UiAction.OnLastNameChange(it)) },
                error = state.showError(RegisterField.LastName),
                keyboardOptions = AppKeyboards.name,
            )
        }
    }
}

@Composable
private fun Dropdowns(state: UiState, onAction: (UiAction) -> Unit, required: String) {
    val genderLabels = listOf(stringResource(Res.string.guest_gender_man_option), stringResource(Res.string.guest_gender_woman_option))
    AuthFieldBlock(
        label = stringResource(Res.string.register_gender),
        error = required.takeIf { state.showError(RegisterField.Gender) },
        compact = true,
    ) {
        AuthDropdownField(
            options = genderLabels,
            selectedIndex = state.gender?.let { GENDER_OPTIONS.indexOf(it) }?.takeIf { it >= 0 },
            onSelect = { onAction(UiAction.OnGenderSelect(GENDER_OPTIONS[it])) },
            placeholder = stringResource(Res.string.register_choose),
            error = state.showError(RegisterField.Gender),
        )
    }
    AuthFieldBlock(
        label = stringResource(Res.string.register_city),
        error = required.takeIf { state.showError(RegisterField.City) },
        compact = true,
    ) {
        AuthDropdownField(
            options = state.cities.map { it.name },
            selectedIndex = state.cities.indexOfFirst { it.id == state.cityId }.takeIf { it >= 0 },
            onSelect = { onAction(UiAction.OnCitySelect(state.cities[it].id)) },
            placeholder = stringResource(Res.string.register_choose),
            error = state.showError(RegisterField.City),
            enabled = !state.citiesLoading,
        )
    }
    AuthFieldBlock(
        label = stringResource(Res.string.register_area),
        error = required.takeIf { state.showError(RegisterField.Area) },
        compact = true,
    ) {
        AuthDropdownField(
            options = state.areas.map { it.name },
            selectedIndex = state.areas.indexOfFirst { it.id == state.areaId }.takeIf { it >= 0 },
            onSelect = { onAction(UiAction.OnAreaSelect(state.areas[it].id)) },
            placeholder = stringResource(if (state.cityId == null) Res.string.register_area_hint else Res.string.register_choose),
            error = state.showError(RegisterField.Area),
            enabled = state.areaEnabled,
        )
    }
}

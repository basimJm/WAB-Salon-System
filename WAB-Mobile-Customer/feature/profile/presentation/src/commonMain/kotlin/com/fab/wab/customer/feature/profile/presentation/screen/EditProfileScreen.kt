package com.fab.wab.customer.feature.profile.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.locations.Country
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.feedback.AppStateContent
import com.fab.wab.customer.designsystem.components.feedback.contentStateOf
import com.fab.wab.customer.designsystem.components.form.AppCountryPicker
import com.fab.wab.customer.designsystem.components.form.AppKeyboards
import com.fab.wab.customer.designsystem.components.form.AppPhoneField
import com.fab.wab.customer.designsystem.components.form.CountryUi
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.navigation.AppTopBar
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.textfield.AppDropdownField
import com.fab.wab.customer.designsystem.components.textfield.AppTextField
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.profile.presentation.analytics.ProfileAnalytics
import com.fab.wab.customer.feature.profile.presentation.controller.contract.EditProfileContract.Field
import com.fab.wab.customer.feature.profile.presentation.controller.contract.EditProfileContract.UiAction
import com.fab.wab.customer.feature.profile.presentation.controller.contract.EditProfileContract.UiState
import com.fab.wab.customer.feature.profile.presentation.resources.Res
import com.fab.wab.customer.feature.profile.presentation.resources.edit_area
import com.fab.wab.customer.feature.profile.presentation.resources.edit_area_hint
import com.fab.wab.customer.feature.profile.presentation.resources.edit_choose
import com.fab.wab.customer.feature.profile.presentation.resources.edit_city
import com.fab.wab.customer.feature.profile.presentation.resources.edit_email
import com.fab.wab.customer.feature.profile.presentation.resources.edit_email_error
import com.fab.wab.customer.feature.profile.presentation.resources.edit_first_name
import com.fab.wab.customer.feature.profile.presentation.resources.edit_gender
import com.fab.wab.customer.feature.profile.presentation.resources.edit_gender_man
import com.fab.wab.customer.feature.profile.presentation.resources.edit_gender_woman
import com.fab.wab.customer.feature.profile.presentation.resources.edit_last_name
import com.fab.wab.customer.feature.profile.presentation.resources.edit_phone_changed_note
import com.fab.wab.customer.feature.profile.presentation.resources.edit_phone_error
import com.fab.wab.customer.feature.profile.presentation.resources.edit_phone_label
import com.fab.wab.customer.feature.profile.presentation.resources.edit_profile_title
import com.fab.wab.customer.feature.profile.presentation.resources.edit_required
import com.fab.wab.customer.feature.profile.presentation.resources.edit_save
import org.jetbrains.compose.resources.stringResource

private val GENDER_OPTIONS = listOf(Gender.MALE, Gender.FEMALE)

/** S22: the S12 form prefilled; the phone-changed note appears when the number differs; Save enabled when valid. */
@Composable
fun EditProfileScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(ProfileAnalytics.EDIT_SCREEN)
    val spacing = AppTheme.spacing
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(Res.string.edit_profile_title), onBack = onBack) },
        handleIme = true,
    ) { padding ->
        AppStateContent(
            state = contentStateOf(
                state.loading,
                isOffline = false,
                state.loadError,
                isEmpty = false,
                hasContent = !state.loading && state.loadError == null,
            ),
            onRetry = { onAction(UiAction.OnRetryLoad) },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            Column(
                modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(spacing.space16),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(spacing.space16),
            ) {
                EditProfileForm(state, onAction, Modifier.widthIn(max = AppTheme.sizes.sheetMaxWidth))
                if (state.phoneChanged) {
                    AppText(
                        text = stringResource(Res.string.edit_phone_changed_note),
                        style = AppTheme.typography.bodySmall,
                        color = AppTheme.colors.muted,
                    )
                }
                AppPrimaryButton(
                    text = stringResource(Res.string.edit_save),
                    onClick = { onAction(UiAction.OnSaveClick) },
                    modifier = Modifier.fillMaxWidth().widthIn(max = AppTheme.sizes.sheetMaxWidth),
                    enabled = state.canSave,
                    loading = state.saving,
                )
            }
        }
    }
    if (state.pickerOpen) {
        AppCountryPicker(
            countries = state.countries.map { it.toUi() },
            selectedCode = state.country?.code,
            onSelect = { onAction(UiAction.OnCountrySelect(it.code)) },
            onDismiss = { onAction(UiAction.OnPickerDismiss) },
        )
    }
}

@Composable
private fun EditProfileForm(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val required = stringResource(Res.string.edit_required)
    val genderLabels = listOf(stringResource(Res.string.edit_gender_man), stringResource(Res.string.edit_gender_woman))
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12)) {
        AppTextField(
            value = state.firstName,
            onValueChange = { onAction(UiAction.OnFirstNameChange(it)) },
            label = stringResource(Res.string.edit_first_name),
            error = required.takeIf { state.showError(Field.FirstName) },
            keyboardOptions = AppKeyboards.name,
        )
        AppTextField(
            value = state.lastName,
            onValueChange = { onAction(UiAction.OnLastNameChange(it)) },
            label = stringResource(Res.string.edit_last_name),
            error = required.takeIf { state.showError(Field.LastName) },
            keyboardOptions = AppKeyboards.name,
        )
        AppTextField(
            value = state.email,
            onValueChange = { onAction(UiAction.OnEmailChange(it)) },
            label = stringResource(Res.string.edit_email),
            error = when {
                !state.showError(Field.Email) -> null
                state.email.isBlank() -> required
                else -> stringResource(Res.string.edit_email_error)
            },
            keyboardOptions = AppKeyboards.email,
        )
        AppDropdownField(
            options = genderLabels,
            selectedIndex = state.gender?.let { GENDER_OPTIONS.indexOf(it) }?.takeIf { it >= 0 },
            onSelect = { onAction(UiAction.OnGenderSelect(GENDER_OPTIONS[it])) },
            placeholder = stringResource(Res.string.edit_choose),
            label = stringResource(Res.string.edit_gender),
            error = required.takeIf { state.showError(Field.Gender) },
        )
        AppDropdownField(
            options = state.cities.map { it.name },
            selectedIndex = state.cities.indexOfFirst { it.id == state.cityId }.takeIf { it >= 0 },
            onSelect = { onAction(UiAction.OnCitySelect(state.cities[it].id)) },
            placeholder = stringResource(Res.string.edit_choose),
            label = stringResource(Res.string.edit_city),
            error = required.takeIf { state.showError(Field.City) },
        )
        AppDropdownField(
            options = state.areas.map { it.name },
            selectedIndex = state.areas.indexOfFirst { it.id == state.areaId }.takeIf { it >= 0 },
            onSelect = { onAction(UiAction.OnAreaSelect(state.areas[it].id)) },
            placeholder = stringResource(if (state.cityId == null) Res.string.edit_area_hint else Res.string.edit_choose),
            label = stringResource(Res.string.edit_area),
            error = required.takeIf { state.showError(Field.Area) },
            enabled = state.areaEnabled,
        )
        AppPhoneField(
            value = state.number,
            onValueChange = { onAction(UiAction.OnNumberChange(it)) },
            country = state.country?.toUi(),
            onCountryClick = { onAction(UiAction.OnCountryClick) },
            label = stringResource(Res.string.edit_phone_label),
            error = stringResource(Res.string.edit_phone_error).takeIf { state.showError(Field.Phone) },
        )
    }
}

private fun Country.toUi(): CountryUi = CountryUi(code = code, name = name, dialCode = dialCode, flagUrl = flagUrl, phoneRegex = phoneRegex)

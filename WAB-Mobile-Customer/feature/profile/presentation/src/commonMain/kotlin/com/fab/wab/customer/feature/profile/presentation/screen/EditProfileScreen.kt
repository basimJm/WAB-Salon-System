package com.fab.wab.customer.feature.profile.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDirection
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.locations.Country
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.designsystem.components.feedback.AppStateContent
import com.fab.wab.customer.designsystem.components.feedback.contentStateOf
import com.fab.wab.customer.designsystem.components.form.AppCountryPicker
import com.fab.wab.customer.designsystem.components.form.AppKeyboards
import com.fab.wab.customer.designsystem.components.form.CountryUi
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.navigation.AppTopBar
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush
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

/** S22: prefilled form (`padding:8px 20px 20px;gap:14px`), phone note when the number changed, sticky Save bar. */
@Composable
fun EditProfileScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(ProfileAnalytics.EDIT_SCREEN)
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(Res.string.edit_profile_title), onBack = onBack) },
        bottomBar = { SaveBar(state, onAction) },
        handleIme = true,
    ) {
        AppStateContent(
            state = contentStateOf(
                state.loading,
                isOffline = false,
                state.loadError,
                isEmpty = false,
                hasContent = !state.loading && state.loadError == null,
            ),
            onRetry = { onAction(UiAction.OnRetryLoad) },
            modifier = Modifier.fillMaxSize(),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(
                        start = EditProfileDesign.formHorizontal,
                        top = EditProfileDesign.formTop,
                        end = EditProfileDesign.formHorizontal,
                        bottom = EditProfileDesign.formBottom,
                    ),
                verticalArrangement = Arrangement.spacedBy(EditProfileDesign.formGap),
            ) {
                EditProfileForm(state, onAction)
                if (state.phoneChanged) PhoneNote()
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
private fun EditProfileForm(state: UiState, onAction: (UiAction) -> Unit) {
    val required = stringResource(Res.string.edit_required)
    val genderLabels = listOf(stringResource(Res.string.edit_gender_man), stringResource(Res.string.edit_gender_woman))
    EditTextField(
        label = stringResource(Res.string.edit_first_name),
        value = state.firstName,
        onValueChange = { onAction(UiAction.OnFirstNameChange(it)) },
        error = required.takeIf { state.showError(Field.FirstName) },
        keyboardOptions = AppKeyboards.name,
    )
    EditTextField(
        label = stringResource(Res.string.edit_last_name),
        value = state.lastName,
        onValueChange = { onAction(UiAction.OnLastNameChange(it)) },
        error = required.takeIf { state.showError(Field.LastName) },
        keyboardOptions = AppKeyboards.name,
    )
    EditTextField(
        label = stringResource(Res.string.edit_email),
        value = state.email,
        onValueChange = { onAction(UiAction.OnEmailChange(it)) },
        error = when {
            !state.showError(Field.Email) -> null
            state.email.isBlank() -> required
            else -> stringResource(Res.string.edit_email_error)
        },
        keyboardOptions = AppKeyboards.email,
        direction = TextDirection.Ltr,
    )
    EditPickerField(
        label = stringResource(Res.string.edit_gender),
        options = genderLabels,
        selectedIndex = state.gender?.let { GENDER_OPTIONS.indexOf(it) }?.takeIf { it >= 0 },
        onSelect = { onAction(UiAction.OnGenderSelect(GENDER_OPTIONS[it])) },
        placeholder = stringResource(Res.string.edit_choose),
        error = required.takeIf { state.showError(Field.Gender) },
    )
    EditPickerField(
        label = stringResource(Res.string.edit_city),
        options = state.cities.map { it.name },
        selectedIndex = state.cities.indexOfFirst { it.id == state.cityId }.takeIf { it >= 0 },
        onSelect = { onAction(UiAction.OnCitySelect(state.cities[it].id)) },
        placeholder = stringResource(Res.string.edit_choose),
        error = required.takeIf { state.showError(Field.City) },
    )
    EditPickerField(
        label = stringResource(Res.string.edit_area),
        options = state.areas.map { it.name },
        selectedIndex = state.areas.indexOfFirst { it.id == state.areaId }.takeIf { it >= 0 },
        onSelect = { onAction(UiAction.OnAreaSelect(state.areas[it].id)) },
        placeholder = stringResource(if (state.cityId == null) Res.string.edit_area_hint else Res.string.edit_choose),
        error = required.takeIf { state.showError(Field.Area) },
        enabled = state.areaEnabled,
    )
    EditPhoneField(
        label = stringResource(Res.string.edit_phone_label),
        value = state.number,
        onValueChange = { onAction(UiAction.OnNumberChange(it)) },
        country = state.country?.toUi(),
        onCountryClick = { onAction(UiAction.OnCountryClick) },
        error = stringResource(Res.string.edit_phone_error).takeIf { state.showError(Field.Phone) },
        keyboardOptions = AppKeyboards.phone,
    )
}

/** `gap:10px;padding:12px 14px;border-radius:14px;background:var(--soft)` accent note with an info icon. */
@Composable
private fun PhoneNote() {
    val colors = AppTheme.colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.soft, AppTheme.shapes.medium)
            .padding(horizontal = EditProfileDesign.noteHorizontal, vertical = EditProfileDesign.noteVertical),
        horizontalArrangement = Arrangement.spacedBy(EditProfileDesign.noteGap),
        verticalAlignment = Alignment.Top,
    ) {
        Icon(AppIcons.Info, contentDescription = null, tint = colors.accent, modifier = Modifier.size(EditProfileDesign.noteIcon))
        AppText(
            text = stringResource(Res.string.edit_phone_changed_note),
            style = AppTheme.typography.bodySmall.copy(
                fontSize = EditProfileDesign.noteTextSize,
                lineHeight = EditProfileDesign.noteLineHeight,
            ),
            color = colors.accent,
        )
    }
}

/** `padding:12px 20px 30px;border-top:1px solid var(--line)`; 54 px Save: gradient when it can save, soft/faint otherwise. */
@Composable
private fun SaveBar(state: UiState, onAction: (UiAction) -> Unit) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    val active = state.canSave
    val container = if (active) Modifier.brandBackground(brandBrush(), shape) else Modifier.clip(shape).background(colors.soft)
    Column(modifier = Modifier.fillMaxWidth()) {
        Box(Modifier.fillMaxWidth().height(AppTheme.sizes.hairline).background(colors.line))
        Box(
            modifier = Modifier
                .padding(start = EditProfileDesign.formHorizontal, top = EditProfileDesign.barTop)
                .padding(end = EditProfileDesign.formHorizontal, bottom = EditProfileDesign.barBottom)
                .fillMaxWidth()
                .height(AppTheme.sizes.buttonHeight)
                .then(container)
                .clickable(enabled = active, role = Role.Button) { onAction(UiAction.OnSaveClick) },
            contentAlignment = Alignment.Center,
        ) {
            if (state.saving) {
                CircularProgressIndicator(
                    modifier = Modifier.size(EditProfileDesign.spinner),
                    color = colors.onGradient,
                    strokeWidth = EditProfileDesign.spinnerStroke,
                    trackColor = colors.onGradient.copy(alpha = EditProfileDesign.spinnerTrackAlpha),
                )
            } else {
                AppText(
                    text = stringResource(Res.string.edit_save),
                    style = AppTheme.typography.labelLarge.copy(
                        fontSize = EditProfileDesign.saveTextSize,
                        fontWeight = FontWeight.SemiBold,
                    ),
                    color = if (active) colors.onGradient else colors.faint,
                    maxLines = 1,
                )
            }
        }
    }
}

private fun Country.toUi(): CountryUi = CountryUi(code = code, name = name, dialCode = dialCode, flagUrl = flagUrl, phoneRegex = phoneRegex)

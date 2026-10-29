package com.fab.wab.merchant.feature.application.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.foundation.selection.toggleable
import com.fab.wab.merchant.core.domain.upload.UploadKind
import com.fab.wab.merchant.designsystem.components.control.AppCheckbox
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppDropdownField
import com.fab.wab.merchant.designsystem.components.textfield.AppTextField
import com.fab.wab.merchant.designsystem.components.upload.LocalPreview
import com.fab.wab.merchant.designsystem.components.upload.UploadItemUi
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.application.domain.model.RegistrationField
import com.fab.wab.merchant.feature.application.presentation.controller.contract.RegistrationContract.UiAction
import com.fab.wab.merchant.feature.application.presentation.controller.contract.RegistrationContract.UiState
import com.fab.wab.merchant.feature.application.presentation.controller.vm.DocumentUpload
import com.fab.wab.merchant.feature.application.presentation.resources.Res
import com.fab.wab.merchant.feature.application.presentation.resources.reg_agree
import com.fab.wab.merchant.feature.application.presentation.resources.reg_area
import com.fab.wab.merchant.feature.application.presentation.resources.reg_area_hint
import com.fab.wab.merchant.feature.application.presentation.resources.reg_city
import com.fab.wab.merchant.feature.application.presentation.resources.reg_first_name
import com.fab.wab.merchant.feature.application.presentation.resources.reg_last_name
import com.fab.wab.merchant.feature.application.presentation.resources.reg_clinic_name
import com.fab.wab.merchant.feature.application.presentation.resources.reg_clinic_name_hint
import com.fab.wab.merchant.feature.application.presentation.resources.reg_required
import com.fab.wab.merchant.feature.application.presentation.resources.reg_salon_name
import com.fab.wab.merchant.feature.application.presentation.resources.reg_salon_name_hint
import com.fab.wab.merchant.feature.application.presentation.resources.reg_select
import com.fab.wab.merchant.feature.application.presentation.resources.reg_terms_error
import com.fab.wab.merchant.feature.application.presentation.resources.reg_terms_link
import org.jetbrains.compose.resources.stringResource
import kotlin.math.round

internal const val SIZE_PLACEHOLDER = "%s"
private const val BYTES_PER_MB = 1_048_576.0
private const val ONE_DECIMAL = 10.0

@Composable
internal fun required(field: RegistrationField, state: UiState): String? =
    if (state.errorOf(field)) stringResource(Res.string.reg_required) else null

@Composable
internal fun SalonFields(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space12)) {
        AppTextField(
            value = state.input.salonName,
            onValueChange = { onAction(UiAction.OnSalonNameChange(it)) },
            label = stringResource(if (state.isClinic) Res.string.reg_clinic_name else Res.string.reg_salon_name),
            placeholder = stringResource(if (state.isClinic) Res.string.reg_clinic_name_hint else Res.string.reg_salon_name_hint),
            error = required(RegistrationField.SALON_NAME, state),
        )
        AudienceFields(state, onAction)
    }
}

@Composable
internal fun OwnerFields(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val select = stringResource(Res.string.reg_select)
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space12)) {
        FieldRow {
            AppTextField(
                value = state.input.firstName,
                onValueChange = { onAction(UiAction.OnFirstNameChange(it)) },
                label = stringResource(Res.string.reg_first_name),
                error = required(RegistrationField.FIRST_NAME, state),
                modifier = Modifier.weight(1f),
            )
            AppTextField(
                value = state.input.lastName,
                onValueChange = { onAction(UiAction.OnLastNameChange(it)) },
                label = stringResource(Res.string.reg_last_name),
                error = required(RegistrationField.LAST_NAME, state),
                modifier = Modifier.weight(1f),
            )
        }
        AppDropdownField(
            options = state.cities.map { it.name },
            selectedIndex = state.cities.indexOfFirst { it.id == state.input.cityId }.takeIf { it >= 0 },
            onSelect = { onAction(UiAction.OnCitySelect(it)) },
            placeholder = select,
            label = stringResource(Res.string.reg_city),
            error = required(RegistrationField.CITY, state),
        )
        AppDropdownField(
            options = state.areas.map { it.name },
            selectedIndex = state.areas.indexOfFirst { it.id == state.input.areaId }.takeIf { it >= 0 },
            onSelect = { onAction(UiAction.OnAreaSelect(it)) },
            placeholder = if (state.input.cityId == null) stringResource(Res.string.reg_area_hint) else select,
            label = stringResource(Res.string.reg_area),
            error = required(RegistrationField.AREA, state),
            enabled = state.input.cityId != null,
        )
    }
}

@Composable
internal fun TermsRow(state: UiState, onAction: (UiAction) -> Unit) {
    Column {
        Row(
            modifier = Modifier.toggleable(
                value = state.input.termsAccepted,
                role = Role.Checkbox,
                onValueChange = { onAction(UiAction.OnTermsToggle) },
            ),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AppCheckbox(checked = state.input.termsAccepted, onCheckedChange = { onAction(UiAction.OnTermsToggle) })
            AppText(text = stringResource(Res.string.reg_agree), style = AppTheme.typography.bodySmall)
        }
        AppText(
            text = stringResource(Res.string.reg_terms_link),
            style = AppTheme.typography.labelMedium,
            color = AppTheme.colors.accent,
            modifier = Modifier.toggleable(value = false, role = Role.Button, onValueChange = { onAction(UiAction.OnTermsClick) }),
        )
        if (state.errorOf(RegistrationField.TERMS)) {
            AppText(
                text = stringResource(Res.string.reg_terms_error),
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colors.danger,
            )
        }
    }
}

/** "1.2 MB" with one decimal; [unitPattern] is the localized `%s MB`. */
internal fun DocumentUpload.toUi(unitPattern: String): UploadItemUi {
    val megabytes = round(file.sizeBytes / BYTES_PER_MB * ONE_DECIMAL) / ONE_DECIMAL
    val image = file.kind == UploadKind.IMAGE
    return UploadItemUi(
        id = file.id,
        name = file.name,
        kind = if (image) UploadKind.IMAGE else UploadKind.DOCUMENT,
        status = status,
        preview = if (image) LocalPreview(file.bytes) else null,
        sizeText = unitPattern.replace(SIZE_PLACEHOLDER, megabytes.toString()),
    )
}

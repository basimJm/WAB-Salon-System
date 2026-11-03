package com.fab.wab.merchant.feature.application.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.domain.salon.Audience
import com.fab.wab.merchant.core.domain.salon.BusinessType
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.card.AppChoiceCard
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.upload.AppDocumentUploader
import com.fab.wab.merchant.designsystem.components.upload.uploadRejectionText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.application.domain.model.RegistrationField
import com.fab.wab.merchant.feature.application.presentation.controller.contract.RegistrationContract.UiAction
import com.fab.wab.merchant.feature.application.presentation.controller.contract.RegistrationContract.UiState
import com.fab.wab.merchant.feature.application.presentation.resources.Res
import com.fab.wab.merchant.feature.application.presentation.resources.reg_audience
import com.fab.wab.merchant.feature.application.presentation.resources.reg_audience_both
import com.fab.wab.merchant.feature.application.presentation.resources.reg_audience_men
import com.fab.wab.merchant.feature.application.presentation.resources.reg_audience_women
import com.fab.wab.merchant.feature.application.presentation.resources.reg_both
import com.fab.wab.merchant.feature.application.presentation.resources.reg_business_type
import com.fab.wab.merchant.feature.application.presentation.resources.reg_clinic
import com.fab.wab.merchant.feature.application.presentation.resources.reg_tattoo_unisex
import com.fab.wab.merchant.feature.application.presentation.resources.reg_tattoo
import com.fab.wab.merchant.feature.application.presentation.resources.reg_clinic_unisex
import com.fab.wab.merchant.feature.application.presentation.resources.reg_medical
import com.fab.wab.merchant.feature.application.presentation.resources.reg_medical_error
import com.fab.wab.merchant.feature.application.presentation.resources.reg_medical_hint
import com.fab.wab.merchant.feature.application.presentation.resources.reg_medical_hint_resubmit
import com.fab.wab.merchant.feature.application.presentation.resources.reg_men
import com.fab.wab.merchant.feature.application.presentation.resources.reg_review
import com.fab.wab.merchant.feature.application.presentation.resources.reg_review_audience
import com.fab.wab.merchant.feature.application.presentation.resources.reg_review_medical
import com.fab.wab.merchant.feature.application.presentation.resources.reg_review_missing
import com.fab.wab.merchant.feature.application.presentation.resources.reg_review_not_uploaded
import com.fab.wab.merchant.feature.application.presentation.resources.reg_review_type
import com.fab.wab.merchant.feature.application.presentation.resources.reg_review_uploaded
import com.fab.wab.merchant.feature.application.presentation.resources.reg_salon
import com.fab.wab.merchant.feature.application.presentation.resources.reg_size_mb
import com.fab.wab.merchant.feature.application.presentation.resources.reg_type_locked
import com.fab.wab.merchant.feature.application.presentation.resources.reg_type_warning
import com.fab.wab.merchant.feature.application.presentation.resources.reg_women
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** Step 1 of M04 (BUSINESS_DOMAIN §5.19): Salon or Clinic; fixed for a resubmission. */
@Composable
internal fun BusinessTypeFields(state: UiState, onAction: (UiAction) -> Unit) {
    val selected = state.input.businessType
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12)) {
        Label(Res.string.reg_business_type)
        FieldRow {
            BusinessType.entries.forEach { type ->
                if (!state.typeLocked || type == selected) {
                    AppChoiceCard(
                        label = stringResource(type.label),
                        selected = type == selected,
                        onClick = { onAction(UiAction.OnBusinessTypeSelect(type)) },
                        icon = type.icon,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
        val error = state.errorOf(RegistrationField.BUSINESS_TYPE)
        AppText(
            text = stringResource(if (state.typeLocked) Res.string.reg_type_locked else Res.string.reg_type_warning),
            style = AppTheme.typography.bodySmall,
            color = if (error) AppTheme.colors.danger else AppTheme.colors.onWarningContainer,
        )
    }
}

/** A salon chooses Men / Women / Both; a clinic is not asked (always both, §5.19). */
@Composable
internal fun AudienceFields(state: UiState, onAction: (UiAction) -> Unit) {
    when (state.input.businessType) {
        BusinessType.CLINIC, BusinessType.TATTOO -> AppText(
            text = stringResource(
                if (state.input.businessType == BusinessType.TATTOO) Res.string.reg_tattoo_unisex else Res.string.reg_clinic_unisex,
            ),
            style = AppTheme.typography.bodySmall,
            color = AppTheme.colors.muted,
        )
        BusinessType.SALON -> Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12)) {
            Label(Res.string.reg_audience)
            FieldRow {
                Audience.entries.forEach { audience ->
                    AppChoiceCard(
                        label = stringResource(audience.choice),
                        selected = audience == state.input.audience,
                        onClick = { onAction(UiAction.OnAudienceSelect(audience)) },
                        icon = audience.icon,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
            required(RegistrationField.AUDIENCE, state)?.let { message ->
                AppText(text = message, style = AppTheme.typography.bodySmall, color = AppTheme.colors.danger)
            }
        }
        null -> Unit
    }
}

/** A clinic's medical license (1–5 files, camera / photo / files), required for a new application. */
@Composable
internal fun MedicalLicenseSection(state: UiState, onAction: (UiAction) -> Unit) {
    val rejection = state.medicalRejection
    val error = when {
        rejection != null -> uploadRejectionText(rejection)
        state.errorOf(RegistrationField.MEDICAL_LICENSE) -> stringResource(Res.string.reg_medical_error)
        else -> null
    }
    AppDocumentUploader(
        label = stringResource(Res.string.reg_medical),
        hint = stringResource(if (state.isResubmission) Res.string.reg_medical_hint_resubmit else Res.string.reg_medical_hint),
        items = state.medicalDocuments.map { it.toUi(stringResource(Res.string.reg_size_mb, SIZE_PLACEHOLDER)) },
        onAdd = { onAction(UiAction.OnAddMedicalLicense) },
        onRemove = { onAction(UiAction.OnRemoveMedicalLicense(it)) },
        onRetry = { onAction(UiAction.OnRetryMedicalLicense(it)) },
        error = error,
    )
}

/** Review before submitting: the type and audience chosen (and the clinic's medical license). */
@Composable
internal fun ReviewCard(state: UiState) {
    val type = state.input.businessType ?: return
    AppCard {
        Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8)) {
            Label(Res.string.reg_review)
            ReviewRow(Res.string.reg_review_type, stringResource(type.label))
            val audience = if (type != BusinessType.SALON) Audience.BOTH else state.input.audience
            ReviewRow(Res.string.reg_review_audience, stringResource(audience?.summary ?: Res.string.reg_review_missing))
            if (type == BusinessType.CLINIC) {
                val uploaded = state.input.medicalLicenseKeys.isNotEmpty()
                ReviewRow(
                    Res.string.reg_review_medical,
                    stringResource(if (uploaded) Res.string.reg_review_uploaded else Res.string.reg_review_not_uploaded),
                )
            }
        }
    }
}

@Composable
private fun ReviewRow(label: StringResource, value: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8)) {
        AppText(text = stringResource(label), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
        AppText(text = value, style = AppTheme.typography.labelMedium)
    }
}

@Composable
private fun Label(text: StringResource) {
    AppText(text = stringResource(text), style = AppTheme.typography.labelMedium, color = AppTheme.colors.accent)
}

private val BusinessType.label: StringResource
    get() = when (this) {
        BusinessType.SALON -> Res.string.reg_salon
        BusinessType.CLINIC -> Res.string.reg_clinic
        BusinessType.TATTOO -> Res.string.reg_tattoo
    }

private val BusinessType.icon
    get() = when (this) {
        BusinessType.SALON -> AppIcons.Store
        BusinessType.CLINIC -> AppIcons.Shield
        BusinessType.TATTOO -> AppIcons.Edit
    }

private val Audience.choice: StringResource
    get() = when (this) {
        Audience.MALE -> Res.string.reg_men
        Audience.FEMALE -> Res.string.reg_women
        Audience.BOTH -> Res.string.reg_both
    }

private val Audience.summary: StringResource
    get() = when (this) {
        Audience.MALE -> Res.string.reg_audience_men
        Audience.FEMALE -> Res.string.reg_audience_women
        Audience.BOTH -> Res.string.reg_audience_both
    }

private val Audience.icon
    get() = when (this) {
        Audience.MALE -> AppIcons.Man
        Audience.FEMALE -> AppIcons.Woman
        Audience.BOTH -> AppIcons.Companions
    }

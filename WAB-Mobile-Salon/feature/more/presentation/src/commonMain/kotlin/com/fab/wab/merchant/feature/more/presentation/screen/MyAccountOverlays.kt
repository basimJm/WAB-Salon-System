package com.fab.wab.merchant.feature.more.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.domain.locations.Country
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.merchant.designsystem.components.form.AppCountryPicker
import com.fab.wab.merchant.designsystem.components.form.AppPhoneField
import com.fab.wab.merchant.designsystem.components.form.CountryUi
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.upload.AppImageCropper
import com.fab.wab.merchant.designsystem.components.upload.AppMediaPicker
import com.fab.wab.merchant.designsystem.components.upload.CropAspect
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MyAccountContract.UiAction
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MyAccountContract.UiState
import com.fab.wab.merchant.feature.more.presentation.resources.Res
import com.fab.wab.merchant.feature.more.presentation.resources.account_continue
import com.fab.wab.merchant.feature.more.presentation.resources.account_new_phone_body
import com.fab.wab.merchant.feature.more.presentation.resources.account_new_phone_title
import com.fab.wab.merchant.feature.more.presentation.resources.account_phone
import com.fab.wab.merchant.feature.more.presentation.resources.account_phone_error
import org.jetbrains.compose.resources.stringResource

/** Photo cropper (1:1) and the change-phone sheet with its country picker. */
@Composable
internal fun AccountOverlays(state: UiState, onAction: (UiAction) -> Unit) {
    AppMediaPicker(state.media) { onAction(UiAction.OnMedia(it)) }
    val spacing = AppTheme.spacing
    state.cropBytes?.let { bytes ->
        AppBottomSheet(onDismiss = { onAction(UiAction.OnCropCancel) }) {
            AppImageCropper(
                bytes = bytes,
                aspect = CropAspect.SQUARE,
                onConfirm = { onAction(UiAction.OnCropConfirm(it)) },
                onCancel = { onAction(UiAction.OnCropCancel) },
                modifier = Modifier.padding(spacing.space16),
            )
        }
    }
    val form = state.phoneForm ?: return
    if (form.pickerOpen) {
        AppCountryPicker(
            countries = state.countries.map { it.toUi() },
            selectedCode = form.countryCode,
            onSelect = { onAction(UiAction.OnCountrySelect(it.code)) },
            onDismiss = { onAction(UiAction.OnCountryDismiss) },
        )
        return
    }
    AppBottomSheet(onDismiss = { onAction(UiAction.OnPhoneDismiss) }) {
        Column(Modifier.fillMaxWidth().padding(spacing.space16), verticalArrangement = Arrangement.spacedBy(spacing.space12)) {
            AppText(text = stringResource(Res.string.account_new_phone_title), style = AppTheme.typography.titleMedium)
            AppText(
                text = stringResource(Res.string.account_new_phone_body),
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colors.muted,
            )
            AppPhoneField(
                value = form.number,
                onValueChange = { onAction(UiAction.OnNumber(it)) },
                country = state.phoneCountry?.toUi(),
                onCountryClick = { onAction(UiAction.OnCountryClick) },
                label = stringResource(Res.string.account_phone),
                error = if (form.showError && !state.phoneValid) stringResource(Res.string.account_phone_error) else null,
            )
            AppButton(stringResource(Res.string.account_continue), { onAction(UiAction.OnPhoneContinue) }, Modifier.fillMaxWidth())
        }
    }
}

private fun Country.toUi(): CountryUi = CountryUi(code = code, name = name, dialCode = dialCode, flagUrl = flagUrl, phoneRegex = phoneRegex)

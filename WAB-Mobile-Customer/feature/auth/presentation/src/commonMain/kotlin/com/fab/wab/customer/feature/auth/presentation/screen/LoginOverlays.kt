package com.fab.wab.customer.feature.auth.presentation.screen

import androidx.compose.runtime.Composable
import com.fab.wab.customer.core.domain.locations.Country
import com.fab.wab.customer.designsystem.components.badge.StatusTone
import com.fab.wab.customer.designsystem.components.dialog.AppDialog
import com.fab.wab.customer.designsystem.components.form.AppCountryPicker
import com.fab.wab.customer.designsystem.components.form.CountryUi
import com.fab.wab.customer.feature.auth.presentation.controller.contract.LoginContract.LoginDialog
import com.fab.wab.customer.feature.auth.presentation.controller.contract.LoginContract.UiAction
import com.fab.wab.customer.feature.auth.presentation.controller.contract.LoginContract.UiState
import com.fab.wab.customer.feature.auth.presentation.resources.Res
import com.fab.wab.customer.feature.auth.presentation.resources.login_blocked_body
import com.fab.wab.customer.feature.auth.presentation.resources.login_blocked_contact
import com.fab.wab.customer.feature.auth.presentation.resources.login_blocked_title
import com.fab.wab.customer.feature.auth.presentation.resources.login_dialog_cancel
import com.fab.wab.customer.feature.auth.presentation.resources.login_not_registered_body
import com.fab.wab.customer.feature.auth.presentation.resources.login_not_registered_register
import com.fab.wab.customer.feature.auth.presentation.resources.login_not_registered_title
import org.jetbrains.compose.resources.stringResource

/** Country picker sheet and the two S11 popups (not registered → S12, blocked → contact us). */
@Composable
fun LoginOverlays(state: UiState, onAction: (UiAction) -> Unit) {
    if (state.pickerOpen) {
        AppCountryPicker(
            countries = state.countries.map { it.toUi() },
            selectedCode = state.country?.code,
            onSelect = { onAction(UiAction.OnCountrySelect(it.code)) },
            onDismiss = { onAction(UiAction.OnPickerDismiss) },
        )
    }
    when (state.dialog) {
        LoginDialog.NotRegistered -> AppDialog(
            title = stringResource(Res.string.login_not_registered_title),
            message = stringResource(Res.string.login_not_registered_body),
            confirmText = stringResource(Res.string.login_not_registered_register),
            dismissText = stringResource(Res.string.login_dialog_cancel),
            onConfirm = { onAction(UiAction.OnDialogConfirm) },
            onDismiss = { onAction(UiAction.OnDialogDismiss) },
        )
        LoginDialog.Blocked -> AppDialog(
            title = stringResource(Res.string.login_blocked_title),
            message = stringResource(Res.string.login_blocked_body),
            confirmText = stringResource(Res.string.login_blocked_contact),
            dismissText = stringResource(Res.string.login_dialog_cancel),
            onConfirm = { onAction(UiAction.OnDialogConfirm) },
            onDismiss = { onAction(UiAction.OnDialogDismiss) },
            tone = StatusTone.Warning,
        )
        null -> Unit
    }
}

internal fun Country.toUi(): CountryUi =
    CountryUi(code = code, name = name, dialCode = dialCode, flagUrl = flagUrl, phoneRegex = phoneRegex)

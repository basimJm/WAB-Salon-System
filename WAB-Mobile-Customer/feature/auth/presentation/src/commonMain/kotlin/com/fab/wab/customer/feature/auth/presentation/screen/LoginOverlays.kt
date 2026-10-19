package com.fab.wab.customer.feature.auth.presentation.screen

import androidx.compose.runtime.Composable
import com.fab.wab.customer.core.domain.locations.Country
import com.fab.wab.customer.designsystem.components.form.CountryUi
import com.fab.wab.customer.feature.auth.presentation.controller.contract.LoginContract.LoginDialog
import com.fab.wab.customer.feature.auth.presentation.controller.contract.LoginContract.UiAction
import com.fab.wab.customer.feature.auth.presentation.controller.contract.LoginContract.UiState
import com.fab.wab.customer.feature.auth.presentation.resources.Res
import com.fab.wab.customer.feature.auth.presentation.resources.auth_dialog_glyph_alert
import com.fab.wab.customer.feature.auth.presentation.resources.auth_dialog_glyph_blocked
import com.fab.wab.customer.feature.auth.presentation.resources.login_blocked_body
import com.fab.wab.customer.feature.auth.presentation.resources.login_blocked_contact
import com.fab.wab.customer.feature.auth.presentation.resources.login_blocked_title
import com.fab.wab.customer.feature.auth.presentation.resources.login_dialog_cancel
import com.fab.wab.customer.feature.auth.presentation.resources.login_not_registered_body
import com.fab.wab.customer.feature.auth.presentation.resources.login_not_registered_register
import com.fab.wab.customer.feature.auth.presentation.resources.login_not_registered_title
import org.jetbrains.compose.resources.stringResource

/** Country sheet and the two S11 popups of the design (`notReg` → S12 with the number, `blocked` → contact us). */
@Composable
fun LoginOverlays(state: UiState, onAction: (UiAction) -> Unit) {
    if (state.pickerOpen) {
        AuthCountrySheet(
            countries = state.countries.map { it.toUi() },
            selectedCode = state.country?.code,
            onSelect = { onAction(UiAction.OnCountrySelect(it.code)) },
            onDismiss = { onAction(UiAction.OnPickerDismiss) },
        )
    }
    when (state.dialog) {
        LoginDialog.NotRegistered -> AuthDialog(
            title = stringResource(Res.string.login_not_registered_title),
            body = stringResource(Res.string.login_not_registered_body),
            primaryText = stringResource(Res.string.login_not_registered_register),
            onPrimary = { onAction(UiAction.OnDialogConfirm) },
            onDismiss = { onAction(UiAction.OnDialogDismiss) },
            secondaryText = stringResource(Res.string.login_dialog_cancel),
            glyph = stringResource(Res.string.auth_dialog_glyph_alert),
        )
        LoginDialog.Blocked -> AuthDialog(
            title = stringResource(Res.string.login_blocked_title),
            body = stringResource(Res.string.login_blocked_body),
            primaryText = stringResource(Res.string.login_blocked_contact),
            onPrimary = { onAction(UiAction.OnDialogConfirm) },
            onDismiss = { onAction(UiAction.OnDialogDismiss) },
            secondaryText = stringResource(Res.string.login_dialog_cancel),
            glyph = stringResource(Res.string.auth_dialog_glyph_blocked),
            tone = AuthDialogTone.Danger,
        )
        null -> Unit
    }
}

internal fun Country.toUi(): CountryUi =
    CountryUi(code = code, name = name, dialCode = dialCode, flagUrl = flagUrl, phoneRegex = phoneRegex)

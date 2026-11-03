package com.fab.wab.merchant.feature.salon.presentation.screen

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.domain.salon.BusinessKind
import com.fab.wab.merchant.designsystem.components.button.AppOutlinedButton
import com.fab.wab.merchant.designsystem.components.dialog.AppDialog
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonProfileContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonProfileContract.UiState
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_clinic_note
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_tattoo_note
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_locked
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_widen
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_widen_body
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_widen_cancel
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_widen_confirm
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_widen_title
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** Under the type: a clinic always serves both; otherwise the type is fixed (a single-audience salon may widen). */
internal fun typeNote(kind: BusinessKind): StringResource = when {
    kind.isClinic -> Res.string.profile_clinic_note
    kind.isTattoo -> Res.string.profile_tattoo_note
    else -> Res.string.profile_locked
}

/** Owner only, MALE / FEMALE salons only (BUSINESS_DOMAIN §5.19); hidden for clinics, BOTH salons and members. */
@Composable
internal fun WidenAudienceButton(state: UiState, onAction: (UiAction) -> Unit) {
    AppOutlinedButton(
        text = stringResource(Res.string.profile_widen),
        onClick = { onAction(UiAction.OnWidenAudience) },
        enabled = !state.widening,
        leadingIcon = AppIcons.Companions,
        modifier = Modifier.fillMaxWidth(),
    )
}

/** Confirms the widening: customers of both genders will see the salon; only WAB can narrow it again. */
@Composable
internal fun WidenAudienceDialog(state: UiState, onAction: (UiAction) -> Unit) {
    if (!state.widenDialog) return
    AppDialog(
        title = stringResource(Res.string.profile_widen_title),
        confirmText = stringResource(Res.string.profile_widen_confirm),
        onConfirm = { onAction(UiAction.OnConfirmWiden) },
        onDismiss = { onAction(UiAction.OnDismissWiden) },
        message = stringResource(Res.string.profile_widen_body),
        dismissText = stringResource(Res.string.profile_widen_cancel),
        icon = AppIcons.Companions,
    )
}

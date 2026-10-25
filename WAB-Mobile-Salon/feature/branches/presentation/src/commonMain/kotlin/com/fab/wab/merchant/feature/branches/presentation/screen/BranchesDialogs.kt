package com.fab.wab.merchant.feature.branches.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.merchant.designsystem.components.dialog.AppDialog
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppTextField
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BlockingBookings
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchesContract.UiAction
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchesContract.UiState
import com.fab.wab.merchant.feature.branches.presentation.resources.Res
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_action_close
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_action_offline
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_blocking_body
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_blocking_booking
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_blocking_title
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_close_body
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_close_title
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_main_body
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_main_title
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_offline_body
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_offline_hint
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_offline_title
import com.fab.wab.merchant.feature.branches.presentation.resources.branches_back
import com.fab.wab.merchant.feature.branches.presentation.resources.branches_cancel
import com.fab.wab.merchant.feature.branches.presentation.resources.branches_confirm
import org.jetbrains.compose.resources.stringResource

/** Confirmations of set-main and close, the offline reason sheet and the bookings that block a close. */
@Composable
internal fun BranchesDialogs(state: UiState, onAction: (UiAction) -> Unit) {
    if (state.confirmMain != null) {
        AppDialog(
            title = stringResource(Res.string.branch_main_title),
            confirmText = stringResource(Res.string.branches_confirm),
            onConfirm = { onAction(UiAction.OnConfirmMain) },
            onDismiss = { onAction(UiAction.OnDismiss) },
            message = stringResource(Res.string.branch_main_body),
            dismissText = stringResource(Res.string.branches_cancel),
            icon = AppIcons.Star,
        )
    }
    if (state.confirmClose != null) {
        AppDialog(
            title = stringResource(Res.string.branch_close_title),
            confirmText = stringResource(Res.string.branch_action_close),
            onConfirm = { onAction(UiAction.OnConfirmClose) },
            onDismiss = { onAction(UiAction.OnDismiss) },
            message = stringResource(Res.string.branch_close_body),
            dismissText = stringResource(Res.string.branches_cancel),
            tone = StatusTone.Danger,
        )
    }
    if (state.offlineFor != null) OfflineSheet(state, onAction)
    state.blocking?.let { BlockingSheet(it, onAction) }
}

@Composable
private fun OfflineSheet(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = { onAction(UiAction.OnDismiss) }) {
        Column(
            modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(spacing.space16),
            verticalArrangement = Arrangement.spacedBy(spacing.space12),
        ) {
            AppText(text = stringResource(Res.string.branch_offline_title), style = AppTheme.typography.titleMedium)
            AppText(text = stringResource(Res.string.branch_offline_body), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
            AppTextField(
                value = state.offlineReason,
                onValueChange = { onAction(UiAction.OnOfflineReason(it)) },
                label = stringResource(Res.string.branch_offline_hint),
                singleLine = false,
            )
            AppButton(
                text = stringResource(Res.string.branch_action_offline),
                onClick = { onAction(UiAction.OnConfirmOffline) },
                modifier = Modifier.fillMaxWidth(),
                enabled = state.canSendOffline,
            )
            AppButton(
                text = stringResource(Res.string.branches_cancel),
                onClick = { onAction(UiAction.OnDismiss) },
                modifier = Modifier.fillMaxWidth(),
                kind = ButtonKind.Text,
            )
        }
    }
}

/** `409 BRANCH_HAS_UPCOMING_BOOKINGS`: each blocking booking opens its details (M09) to cancel or complete it. */
@Composable
private fun BlockingSheet(blocking: BlockingBookings, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = { onAction(UiAction.OnDismiss) }) {
        Column(
            modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(spacing.space16),
            verticalArrangement = Arrangement.spacedBy(spacing.space10),
        ) {
            AppText(text = stringResource(Res.string.branch_blocking_title), style = AppTheme.typography.titleMedium)
            AppText(text = stringResource(Res.string.branch_blocking_body), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
            blocking.bookingIds.forEachIndexed { index, id ->
                AppButton(
                    text = stringResource(Res.string.branch_blocking_booking, index + 1),
                    onClick = { onAction(UiAction.OnOpenBooking(id)) },
                    modifier = Modifier.fillMaxWidth(),
                    kind = ButtonKind.Outlined,
                    leadingIcon = AppIcons.Bookings,
                )
            }
            AppButton(
                text = stringResource(Res.string.branches_back),
                onClick = { onAction(UiAction.OnDismiss) },
                modifier = Modifier.fillMaxWidth(),
                kind = ButtonKind.Text,
            )
        }
    }
}

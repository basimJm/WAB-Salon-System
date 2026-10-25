package com.fab.wab.merchant.feature.more.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.common.TimeFormat
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.merchant.designsystem.components.dialog.AppDialog
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppTextField
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MoreContract.UiAction
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MoreContract.UiState
import com.fab.wab.merchant.feature.more.presentation.resources.Res
import com.fab.wab.merchant.feature.more.presentation.resources.more_cancel
import com.fab.wab.merchant.feature.more.presentation.resources.more_close
import com.fab.wab.merchant.feature.more.presentation.resources.more_delete_body_member
import com.fab.wab.merchant.feature.more.presentation.resources.more_delete_body_owner
import com.fab.wab.merchant.feature.more.presentation.resources.more_delete_confirm_member
import com.fab.wab.merchant.feature.more.presentation.resources.more_delete_done
import com.fab.wab.merchant.feature.more.presentation.resources.more_delete_note
import com.fab.wab.merchant.feature.more.presentation.resources.more_delete_send
import com.fab.wab.merchant.feature.more.presentation.resources.more_delete_title_member
import com.fab.wab.merchant.feature.more.presentation.resources.more_delete_title_owner
import org.jetbrains.compose.resources.stringResource

/**
 * PRD M25 "Delete my account": a member confirms removing their own access (then signed out); the owner sends a
 * salon deletion request with an optional note and sees when it was recorded (store policies).
 */
@Composable
internal fun DeleteAccountSheet(state: UiState, onAction: (UiAction) -> Unit) {
    if (!state.deleteSheet) return
    if (!state.isOwner) {
        AppDialog(
            title = stringResource(Res.string.more_delete_title_member),
            confirmText = stringResource(Res.string.more_delete_confirm_member),
            onConfirm = { onAction(UiAction.OnDeleteConfirm) },
            onDismiss = { onAction(UiAction.OnDeleteDismiss) },
            message = stringResource(Res.string.more_delete_body_member),
            dismissText = stringResource(Res.string.more_cancel),
            icon = AppIcons.Delete,
            tone = StatusTone.Danger,
        )
        return
    }
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = { onAction(UiAction.OnDeleteDismiss) }) {
        Column(Modifier.fillMaxWidth().padding(spacing.space16), verticalArrangement = Arrangement.spacedBy(spacing.space12)) {
            AppText(text = stringResource(Res.string.more_delete_title_owner), style = AppTheme.typography.titleMedium)
            val requestedAt = state.deletionRequestedAt
            if (requestedAt != null) {
                val date = TimeFormat.isoDateText(requestedAt) ?: requestedAt
                AppText(text = stringResource(Res.string.more_delete_done, date), style = AppTheme.typography.bodyMedium)
                AppButton(stringResource(Res.string.more_close), { onAction(UiAction.OnDeleteDismiss) }, Modifier.fillMaxWidth())
            } else {
                AppText(
                    text = stringResource(Res.string.more_delete_body_owner),
                    style = AppTheme.typography.bodyMedium,
                    color = AppTheme.colors.muted,
                )
                AppTextField(
                    value = state.deletionNote,
                    onValueChange = { onAction(UiAction.OnDeletionNote(it)) },
                    label = stringResource(Res.string.more_delete_note),
                    singleLine = false,
                )
                AppButton(
                    stringResource(Res.string.more_delete_send),
                    { onAction(UiAction.OnDeleteConfirm) },
                    Modifier.fillMaxWidth(),
                    kind = ButtonKind.Destructive,
                    loading = state.deleting,
                )
                AppButton(stringResource(Res.string.more_cancel), { onAction(UiAction.OnDeleteDismiss) }, Modifier.fillMaxWidth(), kind = ButtonKind.Text)
            }
        }
    }
}

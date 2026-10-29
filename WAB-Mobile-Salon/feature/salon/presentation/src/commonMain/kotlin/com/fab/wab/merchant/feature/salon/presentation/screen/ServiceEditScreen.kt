package com.fab.wab.merchant.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.domain.upload.UploadLimits
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.control.AppSwitch
import com.fab.wab.merchant.designsystem.components.dialog.AppDialog
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.image.AppImage
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppTextField
import com.fab.wab.merchant.designsystem.components.upload.AppMediaPicker
import com.fab.wab.merchant.designsystem.components.upload.AppUploadAddTile
import com.fab.wab.merchant.designsystem.components.upload.AppUploadTile
import com.fab.wab.merchant.designsystem.components.upload.uploadRejectionText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.salon.domain.ServiceField
import com.fab.wab.merchant.feature.salon.domain.ServiceLimits
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ServiceEditContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ServiceEditContract.UiState
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.service_active
import com.fab.wab.merchant.feature.salon.presentation.resources.service_active_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.service_add
import com.fab.wab.merchant.feature.salon.presentation.resources.service_bride_only
import com.fab.wab.merchant.feature.salon.presentation.resources.service_bride_only_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.service_cancel
import com.fab.wab.merchant.feature.salon.presentation.resources.service_deactivate
import com.fab.wab.merchant.feature.salon.presentation.resources.service_deactivate_body
import com.fab.wab.merchant.feature.salon.presentation.resources.service_deactivate_title
import com.fab.wab.merchant.feature.salon.presentation.resources.service_description
import com.fab.wab.merchant.feature.salon.presentation.resources.service_description_error
import com.fab.wab.merchant.feature.salon.presentation.resources.service_duration
import com.fab.wab.merchant.feature.salon.presentation.resources.service_duration_error
import com.fab.wab.merchant.feature.salon.presentation.resources.service_media
import com.fab.wab.merchant.feature.salon.presentation.resources.service_media_replace
import com.fab.wab.merchant.feature.salon.presentation.resources.service_price
import com.fab.wab.merchant.feature.salon.presentation.resources.service_price_error
import com.fab.wab.merchant.feature.salon.presentation.resources.service_price_hint
import com.fab.wab.merchant.feature.salon.presentation.resources.service_price_note
import com.fab.wab.merchant.feature.salon.presentation.resources.service_save
import org.jetbrains.compose.resources.stringResource

/** PRD M16 service form (design 06 `on.svcForm`). */
@Composable
fun ServiceEditScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonAnalytics.SCREEN_SERVICE_EDIT)
    val spacing = AppTheme.spacing
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = state.title, onBack = onBack) },
        bottomBar = {
            if (!state.loading && state.error == null) {
                AppButton(
                    text = stringResource(if (state.isNew) Res.string.service_add else Res.string.service_save),
                    onClick = { onAction(UiAction.OnSave) },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16, vertical = spacing.space10),
                    enabled = state.canSave,
                    loading = state.saving,
                )
            }
        },
    ) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { AppLoadingIndicator() }
            state.error != null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
            else -> Form(state, onAction, Modifier.padding(padding))
        }
    }
    Dialogs(state, onAction)
    AppMediaPicker(state.media) { onAction(UiAction.OnMedia(it)) }
}

@Composable
private fun Form(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    val errors = state.visibleErrors
    val draft = state.draft
    Column(
        modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(spacing.space16),
        verticalArrangement = Arrangement.spacedBy(spacing.space14),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
            AppImage(state.imageUrl, Modifier.size(AppTheme.sizes.avatar).clip(AppTheme.shapes.medium))
            AppText(
                text = state.title,
                style = AppTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                modifier = Modifier.weight(1f),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
            AppTextField(
                value = draft.price,
                onValueChange = { onAction(UiAction.OnPrice(it)) },
                modifier = Modifier.weight(1f),
                label = stringResource(Res.string.service_price),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                error = if (ServiceField.PRICE in errors) stringResource(Res.string.service_price_error) else null,
            )
            AppTextField(
                value = draft.durationMinutes,
                onValueChange = { onAction(UiAction.OnDuration(it)) },
                modifier = Modifier.weight(1f),
                label = stringResource(Res.string.service_duration),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                error = if (ServiceField.DURATION in errors) stringResource(Res.string.service_duration_error) else null,
            )
        }
        AppText(text = stringResource(Res.string.service_price_hint), style = AppTheme.typography.labelSmall, color = AppTheme.colors.muted)
        if (state.brideAllowed) {
            ToggleRow(
                stringResource(Res.string.service_bride_only),
                stringResource(Res.string.service_bride_only_sub),
                draft.brideOnly,
            ) { onAction(UiAction.OnBrideOnly(it)) }
        }
        AppTextField(
            value = draft.description,
            onValueChange = { onAction(UiAction.OnDescription(it)) },
            label = stringResource(Res.string.service_description),
            singleLine = false,
            error = if (ServiceField.DESCRIPTION in errors) stringResource(Res.string.service_description_error) else null,
        )
        Media(state, onAction)
        ToggleRow(
            stringResource(Res.string.service_active),
            stringResource(Res.string.service_active_sub),
            draft.active,
        ) { onAction(UiAction.OnActive(it)) }
        if (!state.isNew) AppText(
            text = stringResource(Res.string.service_price_note),
            style = AppTheme.typography.bodySmall,
            color = AppTheme.colors.muted,
        )
    }
}

@Composable
private fun Media(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
        AppText(text = stringResource(Res.string.service_media), style = AppTheme.typography.labelLarge)
        val showCurrent = state.uploads.isEmpty()
        if (showCurrent) {
            state.currentMedia.forEach { url -> AppImage(url, Modifier.fillMaxWidth().clip(AppTheme.shapes.medium)) }
        } else if (!state.isNew && state.currentMedia.isNotEmpty()) {
            AppText(
                text = stringResource(Res.string.service_media_replace),
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colors.warning,
            )
        }
        state.uploads.forEach { item ->
            AppUploadTile(
                item = item,
                onRemove = { onAction(UiAction.OnRemoveMedia(item.id)) },
                onRetry = { onAction(UiAction.OnRetryMedia(item.id)) },
            )
        }
        if (state.uploads.size < ServiceLimits.MEDIA_MAX) AppUploadAddTile(
            onClick = { onAction(UiAction.OnAddMedia) },
            hint = stringResource(Res.string.service_media),
        )
    }
}

@Composable
private fun ToggleRow(title: String, subtitle: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                AppText(text = title, style = AppTheme.typography.bodyLarge)
                AppText(text = subtitle, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
            }
            AppSwitch(checked = checked, onCheckedChange = onChange)
        }
    }
}

@Composable
private fun Dialogs(state: UiState, onAction: (UiAction) -> Unit) {
    if (state.confirmDeactivate) {
        AppDialog(
            title = stringResource(Res.string.service_deactivate_title),
            confirmText = stringResource(Res.string.service_deactivate),
            onConfirm = { onAction(UiAction.OnConfirmDeactivate) },
            onDismiss = { onAction(UiAction.OnDismiss) },
            message = stringResource(Res.string.service_deactivate_body),
            dismissText = stringResource(Res.string.service_cancel),
            tone = StatusTone.Warning,
        )
    }
    state.rejection?.let { rejection ->
        AppDialog(
            title = uploadRejectionText(rejection, ServiceLimits.MEDIA_MAX, UploadLimits.VIDEO_MAX_BYTES),
            confirmText = stringResource(Res.string.service_cancel),
            onConfirm = { onAction(UiAction.OnDismiss) },
            onDismiss = { onAction(UiAction.OnDismiss) },
            icon = AppIcons.Info,
            tone = StatusTone.Warning,
        )
    }
}

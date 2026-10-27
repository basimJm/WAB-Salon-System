package com.fab.wab.merchant.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.common.TimeFormat
import com.fab.wab.merchant.designsystem.components.badge.AppStatusBadge
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.merchant.designsystem.components.feedback.AppEmptyState
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppTextField
import com.fab.wab.merchant.designsystem.components.upload.AppImageUploader
import com.fab.wab.merchant.designsystem.components.upload.AppMediaPicker
import com.fab.wab.merchant.designsystem.components.upload.CropAspect
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.salon.domain.CatalogRequest
import com.fab.wab.merchant.feature.salon.domain.CatalogRequestStatus
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.CatalogRequestForm
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.CatalogRequestsContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.CatalogRequestsContract.UiState
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.requests_admin_note
import com.fab.wab.merchant.feature.salon.presentation.resources.requests_approved
import com.fab.wab.merchant.feature.salon.presentation.resources.requests_description
import com.fab.wab.merchant.feature.salon.presentation.resources.requests_description_hint
import com.fab.wab.merchant.feature.salon.presentation.resources.requests_empty
import com.fab.wab.merchant.feature.salon.presentation.resources.requests_image
import com.fab.wab.merchant.feature.salon.presentation.resources.requests_name
import com.fab.wab.merchant.feature.salon.presentation.resources.requests_new
import com.fab.wab.merchant.feature.salon.presentation.resources.requests_pending
import com.fab.wab.merchant.feature.salon.presentation.resources.requests_rejected
import com.fab.wab.merchant.feature.salon.presentation.resources.requests_send
import com.fab.wab.merchant.feature.salon.presentation.resources.requests_title
import org.jetbrains.compose.resources.stringResource

/** PRD M16 catalog requests (design 06 `on.catReq`): list with status and WAB note, request form sheet. */
@Composable
fun CatalogRequestsScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonAnalytics.SCREEN_CATALOG_REQUESTS)
    val spacing = AppTheme.spacing
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(Res.string.requests_title), onBack = onBack) },
        bottomBar = {
            AppButton(
                text = stringResource(Res.string.requests_new),
                onClick = { onAction(UiAction.OnNew) },
                modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16, vertical = spacing.space10),
                leadingIcon = AppIcons.Add,
            )
        },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when {
                state.loading -> AppLoadingIndicator(Modifier.align(Alignment.Center))
                state.error != null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
                state.requests.isEmpty() -> AppEmptyState(
                    title = stringResource(Res.string.requests_empty),
                    modifier = Modifier.align(Alignment.Center),
                )
                else -> LazyColumn(
                    contentPadding = PaddingValues(spacing.space16),
                    verticalArrangement = Arrangement.spacedBy(spacing.space10),
                ) {
                    items(state.requests, key = { it.id }, contentType = { CatalogRequest::class }) { RequestRow(it) }
                }
            }
        }
    }
    state.form?.let { RequestSheet(it, state.sending, onAction) }
    AppMediaPicker(state.media) { onAction(UiAction.OnMedia(it)) }
}

@Composable
private fun RequestRow(request: CatalogRequest) {
    val (label, tone) = when (request.status) {
        CatalogRequestStatus.PENDING -> Res.string.requests_pending to StatusTone.Warning
        CatalogRequestStatus.APPROVED -> Res.string.requests_approved to StatusTone.Success
        CatalogRequestStatus.REJECTED -> Res.string.requests_rejected to StatusTone.Danger
    }
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                AppText(
                    text = request.name,
                    style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    modifier = Modifier.weight(1f),
                )
                AppStatusBadge(text = stringResource(label), tone = tone)
            }
            AppText(text = request.description, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
            TimeFormat.isoDateText(request.createdAt)?.let {
                AppText(text = it, style = AppTheme.typography.labelSmall, color = AppTheme.colors.faint)
            }
            request.adminNote?.let {
                AppText(text = stringResource(Res.string.requests_admin_note, it), style = AppTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun RequestSheet(form: CatalogRequestForm, sending: Boolean, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = { onAction(UiAction.OnDismiss) }) {
        Column(
            modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(spacing.space16),
            verticalArrangement = Arrangement.spacedBy(spacing.space12),
        ) {
            AppText(text = stringResource(Res.string.requests_new), style = AppTheme.typography.titleMedium)
            AppTextField(
                value = form.name,
                onValueChange = { onAction(UiAction.OnName(it)) },
                label = stringResource(Res.string.requests_name),
            )
            AppTextField(
                value = form.description,
                onValueChange = { onAction(UiAction.OnDescription(it)) },
                label = stringResource(Res.string.requests_description),
                placeholder = stringResource(Res.string.requests_description_hint),
                singleLine = false,
            )
            AppText(text = stringResource(Res.string.requests_image), style = AppTheme.typography.labelLarge)
            AppImageUploader(
                item = form.image,
                aspect = CropAspect.SQUARE,
                onPick = { onAction(UiAction.OnPickImage) },
                onRetry = { onAction(UiAction.OnPickImage) },
                modifier = Modifier.width(AppTheme.sizes.avatarLarge),
            )
            AppButton(
                text = stringResource(Res.string.requests_send),
                onClick = { onAction(UiAction.OnSend) },
                modifier = Modifier.fillMaxWidth(),
                enabled = form.valid,
                loading = sending,
            )
        }
    }
}

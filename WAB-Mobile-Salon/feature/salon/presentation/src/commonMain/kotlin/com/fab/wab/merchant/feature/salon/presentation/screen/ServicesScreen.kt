package com.fab.wab.merchant.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.designsystem.components.badge.AppStatusBadge
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.control.AppSwitch
import com.fab.wab.merchant.designsystem.components.dialog.AppDialog
import com.fab.wab.merchant.designsystem.components.feedback.AppEmptyState
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.format.jodText
import com.fab.wab.merchant.designsystem.components.image.AppImage
import com.fab.wab.merchant.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppSearchBar
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.salon.domain.SalonService
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ServicesContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ServicesContract.UiState
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.service_cancel
import com.fab.wab.merchant.feature.salon.presentation.resources.service_deactivate
import com.fab.wab.merchant.feature.salon.presentation.resources.service_deactivate_body
import com.fab.wab.merchant.feature.salon.presentation.resources.service_deactivate_title
import com.fab.wab.merchant.feature.salon.presentation.resources.services_add
import com.fab.wab.merchant.feature.salon.presentation.resources.services_bride_only
import com.fab.wab.merchant.feature.salon.presentation.resources.services_duration
import com.fab.wab.merchant.feature.salon.presentation.resources.services_empty_body
import com.fab.wab.merchant.feature.salon.presentation.resources.services_empty_title
import com.fab.wab.merchant.feature.salon.presentation.resources.services_inactive
import com.fab.wab.merchant.feature.salon.presentation.resources.services_meta
import com.fab.wab.merchant.feature.salon.presentation.resources.services_no_results
import com.fab.wab.merchant.feature.salon.presentation.resources.services_search
import com.fab.wab.merchant.feature.salon.presentation.resources.services_title
import org.jetbrains.compose.resources.stringResource

/** PRD M16 list (design 06 `on.services`): search, rows with price / duration / bride-only / active switch, add. */
@Composable
fun ServicesScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonAnalytics.SCREEN_SERVICES)
    val spacing = AppTheme.spacing
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(Res.string.services_title), onBack = onBack) },
        bottomBar = {
            if (!state.loading && state.error == null) {
                AppButton(
                    text = stringResource(Res.string.services_add),
                    onClick = { onAction(UiAction.OnAdd) },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16, vertical = spacing.space10),
                    leadingIcon = AppIcons.Add,
                )
            }
        },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            BranchPicker(state.branchScope, onSelect = { onAction(UiAction.OnBranchSelect(it)) })
            Box(modifier = Modifier.weight(1f).fillMaxWidth()) { ServicesBody(state, onAction) }
        }
    }
    ServicesDialogs(state, onAction)
}

@Composable
private fun BoxScope.ServicesBody(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    when {
        state.loading -> AppLoadingIndicator(Modifier.align(Alignment.Center))
        state.error != null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
        state.isEmpty -> AppEmptyState(
            title = stringResource(Res.string.services_empty_title),
            message = stringResource(Res.string.services_empty_body),
            actionText = stringResource(Res.string.services_add),
            onAction = { onAction(UiAction.OnAdd) },
            modifier = Modifier.align(Alignment.Center).padding(spacing.space24),
        )
        else -> AppPullToRefresh(refreshing = state.refreshing, onRefresh = { onAction(UiAction.OnRefresh) }) {
            Column {
                AppSearchBar(
                    value = state.query,
                    onValueChange = { onAction(UiAction.OnQuery(it)) },
                    placeholder = stringResource(Res.string.services_search),
                    modifier = Modifier.padding(horizontal = spacing.space16, vertical = spacing.space8),
                )
                if (state.shown.isEmpty()) {
                    AppText(
                        text = stringResource(Res.string.services_no_results),
                        style = AppTheme.typography.bodyMedium,
                        color = AppTheme.colors.muted,
                        modifier = Modifier.padding(spacing.space16),
                    )
                }
                LazyColumn(
                    contentPadding = PaddingValues(spacing.space16),
                    verticalArrangement = Arrangement.spacedBy(spacing.space10),
                ) {
                    items(state.shown, key = { it.id }, contentType = { SalonService::class }) { service ->
                        ServiceRow(service, toggling = service.id in state.toggling, onAction = onAction)
                    }
                }
            }
        }
    }
}

@Composable
private fun ServicesDialogs(state: UiState, onAction: (UiAction) -> Unit) {
    if (state.confirmDeactivate != null) {
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
}

@Composable
private fun ServiceRow(service: SalonService, toggling: Boolean, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    AppCard(modifier = Modifier.fillMaxWidth(), onClick = { onAction(UiAction.OnServiceClick(service.id)) }) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
            AppImage(service.imageUrl, Modifier.size(AppTheme.sizes.avatar).clip(AppTheme.shapes.medium))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(spacing.space4)) {
                AppText(text = service.name, style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
                AppText(
                    text = stringResource(
                        Res.string.services_meta,
                        jodText(service.price),
                        stringResource(Res.string.services_duration, service.durationMinutes),
                    ),
                    style = AppTheme.typography.bodySmall,
                    color = AppTheme.colors.muted,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(spacing.space6)) {
                    if (service.brideOnly) AppStatusBadge(text = stringResource(Res.string.services_bride_only), tone = StatusTone.Accent)
                    if (!service.active) AppStatusBadge(text = stringResource(Res.string.services_inactive), tone = StatusTone.Neutral)
                }
            }
            AppSwitch(checked = service.active, onCheckedChange = { onAction(UiAction.OnToggle(service.id, it)) }, enabled = !toggling)
        }
    }
}

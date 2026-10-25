package com.fab.wab.merchant.feature.branches.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDirection
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.domain.branch.Branch
import com.fab.wab.merchant.core.domain.branch.BranchStatus
import com.fab.wab.merchant.core.ui.utils.LocalAppLocale
import com.fab.wab.merchant.designsystem.components.badge.AppStatusBadge
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.feedback.AppEmptyState
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.branches.presentation.analytics.BranchesAnalytics
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchesContract.UiAction
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchesContract.UiState
import com.fab.wab.merchant.feature.branches.presentation.resources.Res
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_action_close
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_action_edit
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_action_main
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_action_offline
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_action_online
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_incomplete
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_main
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_offline_reason
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_status_active
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_status_closed
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_status_offline
import com.fab.wab.merchant.feature.branches.presentation.resources.branches_add
import com.fab.wab.merchant.feature.branches.presentation.resources.branches_empty
import com.fab.wab.merchant.feature.branches.presentation.resources.branches_hint
import com.fab.wab.merchant.feature.branches.presentation.resources.branches_title
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** Owner branch list (MER-062): main / status / completeness badges, address and phone, the allowed actions only. */
@Composable
fun BranchesScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(BranchesAnalytics.SCREEN_BRANCHES)
    val spacing = AppTheme.spacing
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(Res.string.branches_title), onBack = onBack) },
        bottomBar = {
            if (!state.loading && state.error == null) {
                AppButton(
                    text = stringResource(Res.string.branches_add),
                    onClick = { onAction(UiAction.OnAdd) },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16, vertical = spacing.space10),
                    leadingIcon = AppIcons.Add,
                )
            }
        },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when {
                state.loading -> AppLoadingIndicator(Modifier.align(Alignment.Center))
                state.error != null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
                state.branches.isEmpty() -> AppEmptyState(
                    title = stringResource(Res.string.branches_empty),
                    modifier = Modifier.align(Alignment.Center),
                )
                else -> AppPullToRefresh(refreshing = state.refreshing, onRefresh = { onAction(UiAction.OnRefresh) }) {
                    LazyColumn(
                        contentPadding = PaddingValues(spacing.space16),
                        verticalArrangement = Arrangement.spacedBy(spacing.space10),
                    ) {
                        item(key = HINT_KEY, contentType = HINT_KEY) {
                            AppText(
                                text = stringResource(Res.string.branches_hint),
                                style = AppTheme.typography.bodySmall,
                                color = AppTheme.colors.muted,
                            )
                        }
                        items(state.branches, key = { it.id }, contentType = { Branch::class }) { branch ->
                            BranchRow(branch, busy = branch.id in state.busy, onAction = onAction)
                        }
                    }
                }
            }
        }
    }
    BranchesDialogs(state, onAction)
}

private const val HINT_KEY = "hint"

@Composable
private fun BranchRow(branch: Branch, busy: Boolean, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    AppCard(modifier = Modifier.fillMaxWidth(), onClick = { onAction(UiAction.OnEdit(branch.id)) }) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space6)) {
            AppText(
                text = branch.name.localized(LocalAppLocale.current),
                style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
            )
            Badges(branch)
            branch.locationText?.let { AppText(text = it, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted) }
            branch.phone?.let {
                AppText(
                    text = it,
                    style = AppTheme.typography.bodySmall.copy(textDirection = TextDirection.Ltr),
                    color = AppTheme.colors.muted,
                )
            }
            branch.offlineReason?.takeIf { branch.status == BranchStatus.OFFLINE }?.let {
                AppText(
                    text = stringResource(Res.string.branch_offline_reason, it),
                    style = AppTheme.typography.labelSmall,
                    color = AppTheme.colors.faint,
                )
            }
            Actions(branch, busy, onAction)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Badges(branch: Branch) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6),
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4),
    ) {
        if (branch.isMain) AppStatusBadge(text = stringResource(Res.string.branch_main), tone = StatusTone.Accent, icon = AppIcons.Star)
        val (label, tone) = statusCopy(branch.status)
        AppStatusBadge(text = stringResource(label), tone = tone)
        if (!branch.isComplete && branch.status != BranchStatus.CLOSED) {
            AppStatusBadge(text = stringResource(Res.string.branch_incomplete), tone = StatusTone.Warning)
        }
    }
}

private fun statusCopy(status: BranchStatus): Pair<StringResource, StatusTone> = when (status) {
    BranchStatus.ACTIVE -> Res.string.branch_status_active to StatusTone.Success
    BranchStatus.OFFLINE -> Res.string.branch_status_offline to StatusTone.Warning
    BranchStatus.CLOSED -> Res.string.branch_status_closed to StatusTone.Neutral
}

/** Hidden, not disabled: only the transitions the branch allows (BUSINESS_DOMAIN §5.16). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Actions(branch: Branch, busy: Boolean, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(spacing.space8),
        verticalArrangement = Arrangement.spacedBy(spacing.space6),
    ) {
        if (branch.status != BranchStatus.CLOSED) {
            ActionButton(Res.string.branch_action_edit, busy) { onAction(UiAction.OnEdit(branch.id)) }
        }
        if (branch.canBecomeMain) ActionButton(Res.string.branch_action_main, busy) { onAction(UiAction.OnSetMain(branch.id)) }
        if (branch.canGoOffline) ActionButton(Res.string.branch_action_offline, busy) { onAction(UiAction.OnOffline(branch.id)) }
        if (branch.canGoOnline) ActionButton(Res.string.branch_action_online, busy) { onAction(UiAction.OnOnline(branch.id)) }
        if (branch.canClose) {
            ActionButton(Res.string.branch_action_close, busy, ButtonKind.Destructive) { onAction(UiAction.OnClose(branch.id)) }
        }
    }
}

@Composable
private fun ActionButton(label: StringResource, busy: Boolean, kind: ButtonKind = ButtonKind.Outlined, onClick: () -> Unit) {
    AppButton(text = stringResource(label), onClick = onClick, kind = kind, loading = busy)
}

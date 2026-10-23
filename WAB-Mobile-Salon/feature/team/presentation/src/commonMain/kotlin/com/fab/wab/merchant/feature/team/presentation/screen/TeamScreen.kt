package com.fab.wab.merchant.feature.team.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.designsystem.components.avatar.AppAvatar
import com.fab.wab.merchant.designsystem.components.badge.AppStatusBadge
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.control.AppSwitch
import com.fab.wab.merchant.designsystem.components.dialog.AppDialog
import com.fab.wab.merchant.designsystem.components.feedback.AppEmptyState
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.team.domain.TeamMember
import com.fab.wab.merchant.feature.team.presentation.analytics.TeamAnalytics
import com.fab.wab.merchant.feature.team.presentation.controller.contract.TeamContract.UiAction
import com.fab.wab.merchant.feature.team.presentation.controller.contract.TeamContract.UiState
import com.fab.wab.merchant.feature.team.presentation.resources.Res
import com.fab.wab.merchant.feature.team.presentation.resources.team_add
import com.fab.wab.merchant.feature.team.presentation.resources.team_cancel
import com.fab.wab.merchant.feature.team.presentation.resources.team_conflict_body
import com.fab.wab.merchant.feature.team.presentation.resources.team_deactivate
import com.fab.wab.merchant.feature.team.presentation.resources.team_deactivate_body
import com.fab.wab.merchant.feature.team.presentation.resources.team_deactivate_title
import com.fab.wab.merchant.feature.team.presentation.resources.team_empty
import com.fab.wab.merchant.feature.team.presentation.resources.team_inactive
import com.fab.wab.merchant.feature.team.presentation.resources.team_owner_locked
import com.fab.wab.merchant.feature.team.presentation.resources.team_provides
import com.fab.wab.merchant.feature.team.presentation.resources.team_title
import org.jetbrains.compose.resources.stringResource

/** PRD M17 list (design 06 `on.team`): photo, name, role, provides-services and inactive badges, owner-only actions. */
@Composable
fun TeamScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(TeamAnalytics.SCREEN_TEAM)
    val spacing = AppTheme.spacing
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(Res.string.team_title), onBack = onBack) },
        bottomBar = {
            if (state.access.canAdd && !state.loading) {
                AppButton(
                    text = stringResource(Res.string.team_add),
                    onClick = { onAction(UiAction.OnAdd) },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16, vertical = spacing.space10),
                    leadingIcon = AppIcons.AddPerson,
                )
            }
        },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when {
                state.loading -> AppLoadingIndicator(Modifier.align(Alignment.Center))
                state.error != null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
                state.members.isEmpty() -> AppEmptyState(
                    title = stringResource(Res.string.team_empty),
                    modifier = Modifier.align(Alignment.Center),
                )
                else -> AppPullToRefresh(refreshing = state.refreshing, onRefresh = { onAction(UiAction.OnRefresh) }) {
                    LazyColumn(
                        contentPadding = PaddingValues(spacing.space16),
                        verticalArrangement = Arrangement.spacedBy(spacing.space10),
                    ) {
                        items(
                            state.members,
                            key = { it.id },
                            contentType = { TeamMember::class },
                        ) { member -> MemberRow(member, state, onAction) }
                    }
                }
            }
        }
    }
    TeamDialogs(state, onAction)
}

@Composable
private fun MemberRow(member: TeamMember, state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val opens = state.access.canEdit(member) || state.access.canEditStaff(member)
    AppCard(modifier = Modifier.fillMaxWidth(), onClick = if (opens) ({ onAction(UiAction.OnMemberClick(member.id)) }) else null) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
            AppAvatar(name = member.fullName, imageUrl = member.photoUrl, available = member.active)
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(spacing.space4)) {
                AppText(text = member.fullName, style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
                Row(horizontalArrangement = Arrangement.spacedBy(spacing.space6)) {
                    AppStatusBadge(text = stringResource(member.role.label()), tone = StatusTone.Accent)
                    if (member.providesServices) AppStatusBadge(text = stringResource(Res.string.team_provides), tone = StatusTone.Success)
                    if (!member.active) AppStatusBadge(text = stringResource(Res.string.team_inactive), tone = StatusTone.Neutral)
                }
                if (member.isOwner && state.access.manageTeam) {
                    AppText(
                        text = stringResource(Res.string.team_owner_locked),
                        style = AppTheme.typography.labelSmall,
                        color = AppTheme.colors.faint,
                    )
                }
            }
            if (state.access.canToggleActive(member)) {
                AppSwitch(
                    checked = member.active,
                    onCheckedChange = { onAction(UiAction.OnActiveChange(member.id, it)) },
                    enabled = member.id !in state.busy,
                )
            }
        }
    }
}

@Composable
private fun TeamDialogs(state: UiState, onAction: (UiAction) -> Unit) {
    if (state.confirmDeactivate != null) {
        AppDialog(
            title = stringResource(Res.string.team_deactivate_title),
            confirmText = stringResource(Res.string.team_deactivate),
            onConfirm = { onAction(UiAction.OnConfirmDeactivate) },
            onDismiss = { onAction(UiAction.OnDismiss) },
            message = stringResource(Res.string.team_deactivate_body),
            dismissText = stringResource(Res.string.team_cancel),
            tone = StatusTone.Danger,
        )
    }
    if (state.conflict != null) {
        AffectedBookingsSheet(
            body = stringResource(Res.string.team_conflict_body),
            onReassign = { onAction(UiAction.OnConflictReassign) },
            onCancelBookings = { onAction(UiAction.OnConflictCancelBookings) },
            onBack = { onAction(UiAction.OnDismiss) },
        )
    }
}

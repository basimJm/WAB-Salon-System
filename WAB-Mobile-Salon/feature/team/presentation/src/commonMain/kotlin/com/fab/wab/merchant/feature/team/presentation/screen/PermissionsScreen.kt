package com.fab.wab.merchant.feature.team.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.domain.permission.OwnerCapability
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.designsystem.components.avatar.AppAvatar
import com.fab.wab.merchant.designsystem.components.badge.AppStatusBadge
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.control.AppSwitch
import com.fab.wab.merchant.designsystem.components.divider.AppDivider
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.team.domain.PermissionGroup
import com.fab.wab.merchant.feature.team.domain.visiblePermissions
import com.fab.wab.merchant.feature.team.presentation.analytics.TeamAnalytics
import com.fab.wab.merchant.feature.team.presentation.controller.contract.PermissionsContract.UiAction
import com.fab.wab.merchant.feature.team.presentation.controller.contract.PermissionsContract.UiState
import com.fab.wab.merchant.feature.team.presentation.resources.Res
import com.fab.wab.merchant.feature.team.presentation.resources.perm_apply_template
import com.fab.wab.merchant.feature.team.presentation.resources.perm_count
import com.fab.wab.merchant.feature.team.presentation.resources.perm_note
import com.fab.wab.merchant.feature.team.presentation.resources.perm_owner_only
import com.fab.wab.merchant.feature.team.presentation.resources.perm_save
import com.fab.wab.merchant.feature.team.presentation.resources.perm_title
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

/** PRD M18 (design 06 `on.perms`): member header, role template, grouped toggles; owner-only rows locked. */
@Composable
fun PermissionsScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(TeamAnalytics.SCREEN_PERMISSIONS)
    val spacing = AppTheme.spacing
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(Res.string.perm_title), onBack = onBack) },
        bottomBar = {
            if (state.member?.isOwner == false) {
                AppButton(
                    text = stringResource(Res.string.perm_save),
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
            else -> Column(
                modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(spacing.space16),
                verticalArrangement = Arrangement.spacedBy(spacing.space14),
            ) {
                Header(state, onAction)
                AppText(text = stringResource(Res.string.perm_note), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
                PermissionGroup.entries.forEach { group -> GroupCard(group, state, onAction) }
            }
        }
    }
}

@Composable
private fun Header(state: UiState, onAction: (UiAction) -> Unit) {
    val member = state.member ?: return
    val spacing = AppTheme.spacing
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
        AppAvatar(name = member.fullName, imageUrl = member.photoUrl)
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(spacing.space4)) {
            AppText(text = member.fullName, style = AppTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space6)) {
                AppStatusBadge(text = stringResource(member.role.label()), tone = StatusTone.Accent)
                AppText(
                    text = pluralStringResource(Res.plurals.perm_count, state.selected.size, state.selected.size),
                    style = AppTheme.typography.labelSmall,
                    color = AppTheme.colors.muted,
                )
            }
        }
    }
    if (!member.isOwner) AppButton(
        stringResource(Res.string.perm_apply_template),
        { onAction(UiAction.OnApplyTemplate) },
        kind = ButtonKind.Outlined,
    )
}

@Composable
private fun GroupCard(group: PermissionGroup, state: UiState, onAction: (UiAction) -> Unit) {
    val locked = state.member?.isOwner == true
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8)) {
            AppText(text = stringResource(group.title()), style = AppTheme.typography.labelLarge, color = AppTheme.colors.accent)
            group.visiblePermissions(state.member).forEachIndexed { index, permission ->
                if (index > 0) AppDivider()
                PermissionRow(
                    permission,
                    checked = locked || permission in state.selected,
                    enabled = !locked,
                ) { onAction(UiAction.OnToggle(permission)) }
            }
            group.ownerOnly.forEach { capability -> OwnerOnlyRow(capability) }
        }
    }
}

@Composable
private fun PermissionRow(permission: Permission, checked: Boolean, enabled: Boolean, onToggle: () -> Unit) {
    val (title, subtitle) = permission.copy() ?: return
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(modifier = Modifier.weight(1f)) {
            AppText(text = stringResource(title), style = AppTheme.typography.bodyLarge)
            AppText(text = stringResource(subtitle), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
        }
        AppSwitch(checked = checked, onCheckedChange = { onToggle() }, enabled = enabled)
    }
}

@Composable
private fun OwnerOnlyRow(capability: OwnerCapability) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8)) {
        Icon(AppIcons.Lock, contentDescription = null, tint = AppTheme.colors.faint)
        AppText(
            text = stringResource(capability.title()),
            style = AppTheme.typography.bodyMedium,
            color = AppTheme.colors.faint,
            modifier = Modifier.weight(1f),
        )
        AppText(text = stringResource(Res.string.perm_owner_only), style = AppTheme.typography.labelSmall, color = AppTheme.colors.faint)
    }
}

package com.fab.wab.merchant.feature.more.presentation.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.domain.ThemeMode
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.designsystem.components.avatar.AppAvatar
import com.fab.wab.merchant.designsystem.components.badge.AppStatusBadge
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.control.AppSwitch
import com.fab.wab.merchant.designsystem.components.dialog.AppContactSheet
import com.fab.wab.merchant.designsystem.components.dialog.AppDialog
import com.fab.wab.merchant.designsystem.components.divider.AppDivider
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.more.presentation.analytics.MoreAnalytics
import com.fab.wab.merchant.feature.more.presentation.analytics.MoreSlugs
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MoreContract.UiAction
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MoreContract.UiState
import com.fab.wab.merchant.feature.more.presentation.resources.Res
import com.fab.wab.merchant.feature.more.presentation.resources.more_about
import com.fab.wab.merchant.feature.more.presentation.resources.more_account
import com.fab.wab.merchant.feature.more.presentation.resources.more_cancel
import com.fab.wab.merchant.feature.more.presentation.resources.more_contact
import com.fab.wab.merchant.feature.more.presentation.resources.more_dark_mode
import com.fab.wab.merchant.feature.more.presentation.resources.more_employee
import com.fab.wab.merchant.feature.more.presentation.resources.more_faq
import com.fab.wab.merchant.feature.more.presentation.resources.more_language
import com.fab.wab.merchant.feature.more.presentation.resources.more_language_value
import com.fab.wab.merchant.feature.more.presentation.resources.more_logout
import com.fab.wab.merchant.feature.more.presentation.resources.more_logout_body
import com.fab.wab.merchant.feature.more.presentation.resources.more_logout_title
import com.fab.wab.merchant.feature.more.presentation.resources.more_manager
import com.fab.wab.merchant.feature.more.presentation.resources.more_notifications
import com.fab.wab.merchant.feature.more.presentation.resources.more_overlay
import com.fab.wab.merchant.feature.more.presentation.resources.more_overlay_off
import com.fab.wab.merchant.feature.more.presentation.resources.more_overlay_on
import com.fab.wab.merchant.feature.more.presentation.resources.more_owner
import com.fab.wab.merchant.feature.more.presentation.resources.more_privacy
import com.fab.wab.merchant.feature.more.presentation.resources.more_push
import com.fab.wab.merchant.feature.more.presentation.resources.more_push_sub
import com.fab.wab.merchant.feature.more.presentation.resources.more_settings
import com.fab.wab.merchant.feature.more.presentation.resources.more_sound
import com.fab.wab.merchant.feature.more.presentation.resources.more_sound_sub
import com.fab.wab.merchant.feature.more.presentation.resources.more_support
import com.fab.wab.merchant.feature.more.presentation.resources.more_terms
import com.fab.wab.merchant.feature.more.presentation.resources.more_title
import com.fab.wab.merchant.feature.more.presentation.resources.more_version
import org.jetbrains.compose.resources.stringResource

/** PRD M25 part 1 (design 08 `on.more`). */
@Composable
fun MoreScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(MoreAnalytics.SCREEN_MORE)
    val spacing = AppTheme.spacing
    AppScreen(modifier = modifier, scrollsUnderTabBar = true) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(spacing.space16),
            verticalArrangement = Arrangement.spacedBy(spacing.space14),
        ) {
            AppText(text = stringResource(Res.string.more_title), style = AppTheme.typography.headlineMedium)
            AccountCard(state)
            Group(stringResource(Res.string.more_settings)) {
                Item(
                    AppIcons.Language,
                    stringResource(Res.string.more_language),
                    stringResource(Res.string.more_language_value),
                ) { onAction(UiAction.OnLanguageToggle) }
                AppDivider()
                SwitchItem(
                    AppIcons.ThemeDark,
                    stringResource(Res.string.more_dark_mode),
                    null,
                    state.themeMode == ThemeMode.DARK,
                ) { onAction(UiAction.OnDarkMode(it)) }
                AppDivider()
                SwitchItem(
                    AppIcons.Notifications,
                    stringResource(Res.string.more_push),
                    stringResource(Res.string.more_push_sub),
                    state.pushEnabled,
                ) { onAction(UiAction.OnPush(it)) }
                if (state.overlaySupported) {
                    AppDivider()
                    Item(
                        AppIcons.Device,
                        stringResource(Res.string.more_overlay),
                        stringResource(if (state.overlayGranted) Res.string.more_overlay_on else Res.string.more_overlay_off),
                    ) { onAction(UiAction.OnOverlay) }
                }
                AppDivider()
                Item(
                    AppIcons.Play,
                    stringResource(Res.string.more_sound),
                    stringResource(Res.string.more_sound_sub),
                ) { onAction(UiAction.OnSoundTest) }
                AppDivider()
                Item(AppIcons.Notifications, stringResource(Res.string.more_notifications), null) { onAction(UiAction.OnNotifications) }
            }
            Group(stringResource(Res.string.more_support)) {
                Item(AppIcons.Chat, stringResource(Res.string.more_contact), null) { onAction(UiAction.OnContact) }
                AppDivider()
                Item(AppIcons.Help, stringResource(Res.string.more_faq), null) { onAction(UiAction.OnFaq) }
                AppDivider()
                Item(AppIcons.Legal, stringResource(Res.string.more_terms), null) { onAction(UiAction.OnContent(MoreSlugs.TERMS)) }
                AppDivider()
                Item(AppIcons.Shield, stringResource(Res.string.more_privacy), null) { onAction(UiAction.OnContent(MoreSlugs.PRIVACY)) }
                AppDivider()
                Item(AppIcons.Info, stringResource(Res.string.more_about), null) { onAction(UiAction.OnContent(MoreSlugs.ABOUT)) }
            }
            AppButton(
                text = stringResource(Res.string.more_logout),
                onClick = { onAction(UiAction.OnLogout) },
                modifier = Modifier.fillMaxWidth(),
                kind = ButtonKind.Destructive,
                loading = state.loggingOut,
                leadingIcon = AppIcons.Logout,
            )
            AppText(
                text = stringResource(Res.string.more_version, state.version, state.versionCode),
                style = AppTheme.typography.labelSmall,
                color = AppTheme.colors.faint,
                modifier = Modifier.align(Alignment.CenterHorizontally),
            )
        }
    }
    MoreDialogs(state, onAction)
}

@Composable
private fun AccountCard(state: UiState) {
    val role = when (state.role) {
        MemberRole.OWNER -> Res.string.more_owner
        MemberRole.MANAGER -> Res.string.more_manager
        MemberRole.EMPLOYEE -> Res.string.more_employee
        null -> null
    }
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12)) {
            AppAvatar(name = state.memberName)
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4)) {
                AppText(
                    text = stringResource(Res.string.more_account),
                    style = AppTheme.typography.labelMedium,
                    color = AppTheme.colors.muted,
                )
                AppText(text = state.memberName, style = AppTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
            }
            role?.let { AppStatusBadge(text = stringResource(it), tone = StatusTone.Accent) }
        }
    }
}

@Composable
private fun Group(title: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6)) {
        AppText(text = title, style = AppTheme.typography.labelLarge, color = AppTheme.colors.muted)
        AppCard(modifier = Modifier.fillMaxWidth(), contentPadding = AppTheme.spacing.space8) {
            Column { content() }
        }
    }
}

@Composable
private fun Item(icon: ImageVector, title: String, subtitle: String?, onClick: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = onClick).padding(AppTheme.spacing.space8)) {
        Line(icon, title, subtitle) { Icon(AppIcons.Forward, contentDescription = null, tint = AppTheme.colors.faint) }
    }
}

@Composable
private fun SwitchItem(icon: ImageVector, title: String, subtitle: String?, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.padding(AppTheme.spacing.space8),
    ) { Line(icon, title, subtitle) { AppSwitch(checked = checked, onCheckedChange = onChange) } }
}

@Composable
private fun Line(icon: ImageVector, title: String, subtitle: String?, trailing: @Composable () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().heightIn(min = AppTheme.sizes.touchTarget),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12),
    ) {
        Icon(icon, contentDescription = null, tint = AppTheme.colors.accent)
        Column(modifier = Modifier.weight(1f)) {
            AppText(text = title, style = AppTheme.typography.bodyLarge)
            subtitle?.let { AppText(text = it, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted) }
        }
        trailing()
    }
}

@Composable
private fun MoreDialogs(state: UiState, onAction: (UiAction) -> Unit) {
    if (state.logoutDialog) {
        AppDialog(
            title = stringResource(Res.string.more_logout_title),
            confirmText = stringResource(Res.string.more_logout),
            onConfirm = { onAction(UiAction.OnLogoutConfirm) },
            onDismiss = { onAction(UiAction.OnDismiss) },
            message = stringResource(Res.string.more_logout_body),
            dismissText = stringResource(Res.string.more_cancel),
            icon = AppIcons.Logout,
            tone = StatusTone.Danger,
        )
    }
    if (state.contactOpen) {
        val contact = state.contact
        AppContactSheet(
            onDismiss = { onAction(UiAction.OnDismissContact) },
            onCall = contact?.phone?.takeIf { it.isNotBlank() }?.let { { onAction(UiAction.OnCall) } },
            onWhatsApp = contact?.whatsapp?.takeIf { it.isNotBlank() }?.let { { onAction(UiAction.OnWhatsApp) } },
            onEmail = contact?.email?.takeIf { it.isNotBlank() }?.let { { onAction(UiAction.OnEmail) } },
        )
    }
}

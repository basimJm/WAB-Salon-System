package com.fab.wab.customer.feature.profile.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.AppLanguage
import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.designsystem.components.layout.tabBarInset
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.profile.presentation.analytics.ProfileAnalytics
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract.UiAction
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract.UiState
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileLink
import com.fab.wab.customer.feature.profile.presentation.resources.Res
import com.fab.wab.customer.feature.profile.presentation.resources.profile_about
import com.fab.wab.customer.feature.profile.presentation.resources.profile_contact
import com.fab.wab.customer.feature.profile.presentation.resources.profile_delete_account
import com.fab.wab.customer.feature.profile.presentation.resources.profile_faq
import com.fab.wab.customer.feature.profile.presentation.resources.profile_language
import com.fab.wab.customer.feature.profile.presentation.resources.profile_language_ar
import com.fab.wab.customer.feature.profile.presentation.resources.profile_language_en
import com.fab.wab.customer.feature.profile.presentation.resources.profile_login
import com.fab.wab.customer.feature.profile.presentation.resources.profile_logout
import com.fab.wab.customer.feature.profile.presentation.resources.profile_notifications
import com.fab.wab.customer.feature.profile.presentation.resources.profile_personal_info
import com.fab.wab.customer.feature.profile.presentation.resources.profile_privacy
import com.fab.wab.customer.feature.profile.presentation.resources.profile_rate
import com.fab.wab.customer.feature.profile.presentation.resources.profile_register_salon
import com.fab.wab.customer.feature.profile.presentation.resources.profile_section_account
import com.fab.wab.customer.feature.profile.presentation.resources.profile_section_business
import com.fab.wab.customer.feature.profile.presentation.resources.profile_section_legal
import com.fab.wab.customer.feature.profile.presentation.resources.profile_section_settings
import com.fab.wab.customer.feature.profile.presentation.resources.profile_section_support
import com.fab.wab.customer.feature.profile.presentation.resources.profile_share
import com.fab.wab.customer.feature.profile.presentation.resources.profile_terms
import com.fab.wab.customer.feature.profile.presentation.resources.profile_theme
import com.fab.wab.customer.feature.profile.presentation.resources.profile_theme_dark
import com.fab.wab.customer.feature.profile.presentation.resources.profile_theme_light
import com.fab.wab.customer.feature.profile.presentation.resources.profile_theme_system
import com.fab.wab.customer.feature.profile.presentation.resources.profile_version
import org.jetbrains.compose.resources.stringResource

/** S21 (no top bar in the design): header card, Account (registered), Settings, Support, Business, Legal, session, version. */
@Composable
fun ProfileScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(ProfileAnalytics.SCREEN)
    AppScreen(modifier = modifier, scrollsUnderTabBar = true) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.statusBars)
                .verticalScroll(rememberScrollState())
                .padding(
                    start = ProfileDesign.screenHorizontal,
                    top = ProfileDesign.screenTop,
                    end = ProfileDesign.screenHorizontal,
                    bottom = ProfileDesign.screenBottom + tabBarInset(),
                ),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            ProfileHeader(state, onAction, Modifier.padding(bottom = ProfileDesign.headerBottom))
            Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(ProfileDesign.sectionGap)) {
                if (state.signedIn) AccountSection(onAction)
                SettingsSection(state, onAction)
                SupportSection(onAction)
                ProfileSection(title = stringResource(Res.string.profile_section_business)) {
                    ProfileRow(
                        AppIcons.Business,
                        stringResource(Res.string.profile_register_salon),
                        onClick = { onAction(UiAction.OnLinkClick(ProfileLink.REGISTER_SALON)) },
                        divider = false,
                    )
                }
                LegalSection(onAction)
                SessionActions(state, onAction)
            }
            AppText(
                text = stringResource(Res.string.profile_version, state.appVersion),
                style = AppTheme.typography.bodySmall.copy(fontSize = ProfileDesign.versionSize),
                color = AppTheme.colors.faint,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(top = ProfileDesign.versionTop),
            )
        }
    }
    ProfileOverlays(state, onAction)
}

@Composable
private fun AccountSection(onAction: (UiAction) -> Unit) {
    ProfileSection(title = stringResource(Res.string.profile_section_account)) {
        ProfileRow(
            AppIcons.Profile,
            stringResource(Res.string.profile_personal_info),
            onClick = { onAction(UiAction.OnLinkClick(ProfileLink.PERSONAL_INFO)) },
            divider = false,
        )
    }
}

@Composable
private fun SettingsSection(state: UiState, onAction: (UiAction) -> Unit) {
    ProfileSection(title = stringResource(Res.string.profile_section_settings)) {
        ProfileRow(
            AppIcons.Language,
            stringResource(Res.string.profile_language),
            value = state.language.label(),
            onClick = { onAction(UiAction.OnLanguageClick) },
        )
        ProfileRow(
            AppIcons.ThemeDark,
            stringResource(Res.string.profile_theme),
            value = state.themeMode.label(),
            onClick = { onAction(UiAction.OnThemeClick) },
        )
        ProfileRow(
            AppIcons.Notifications,
            stringResource(Res.string.profile_notifications),
            onClick = { onAction(UiAction.OnPushToggle(!state.pushEnabled)) },
            divider = false,
        ) { ProfileToggle(checked = state.pushEnabled, onCheckedChange = { onAction(UiAction.OnPushToggle(it)) }) }
    }
}

@Composable
private fun SupportSection(onAction: (UiAction) -> Unit) {
    ProfileSection(title = stringResource(Res.string.profile_section_support)) {
        ProfileRow(AppIcons.Call, stringResource(Res.string.profile_contact), onClick = { onAction(UiAction.OnContactClick) })
        ProfileRow(AppIcons.Help, stringResource(Res.string.profile_faq), onClick = { onAction(UiAction.OnLinkClick(ProfileLink.FAQ)) })
        ProfileRow(
            AppIcons.Star,
            stringResource(Res.string.profile_rate),
            onClick = { onAction(UiAction.OnLinkClick(ProfileLink.RATE_APP)) },
        )
        ProfileRow(
            AppIcons.Share,
            stringResource(Res.string.profile_share),
            onClick = { onAction(UiAction.OnLinkClick(ProfileLink.SHARE_APP)) },
            divider = false,
        )
    }
}

@Composable
private fun LegalSection(onAction: (UiAction) -> Unit) {
    ProfileSection(title = stringResource(Res.string.profile_section_legal)) {
        ProfileRow(
            AppIcons.Legal,
            stringResource(Res.string.profile_privacy),
            onClick = { onAction(UiAction.OnLinkClick(ProfileLink.PRIVACY)) },
        )
        ProfileRow(
            AppIcons.Legal,
            stringResource(Res.string.profile_terms),
            onClick = { onAction(UiAction.OnLinkClick(ProfileLink.TERMS)) },
        )
        ProfileRow(
            AppIcons.Info,
            stringResource(Res.string.profile_about),
            onClick = { onAction(UiAction.OnLinkClick(ProfileLink.ABOUT)) },
            divider = false,
        )
    }
}

/** Guest: gradient Log in. Registered: outlined Log out (52) + pink Delete account text (46, 8 below). */
@Composable
private fun SessionActions(state: UiState, onAction: (UiAction) -> Unit) {
    Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        if (state.signedIn) {
            OutlineButton(
                text = stringResource(Res.string.profile_logout),
                onClick = { onAction(UiAction.OnLogoutClick) },
                modifier = Modifier.fillMaxWidth(),
                enabled = !state.busy,
            )
            PlainTextButton(
                text = stringResource(Res.string.profile_delete_account),
                onClick = { onAction(UiAction.OnDeleteAccountClick) },
                modifier = Modifier.fillMaxWidth().padding(top = ProfileDesign.deleteTop),
                enabled = !state.busy,
            )
        } else {
            GradientButton(
                text = stringResource(Res.string.profile_login),
                onClick = { onAction(UiAction.OnLoginClick) },
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
internal fun AppLanguage.label(): String = when (this) {
    AppLanguage.ARABIC -> stringResource(Res.string.profile_language_ar)
    AppLanguage.ENGLISH -> stringResource(Res.string.profile_language_en)
}

@Composable
internal fun ThemeMode.label(): String = when (this) {
    ThemeMode.LIGHT -> stringResource(Res.string.profile_theme_light)
    ThemeMode.DARK -> stringResource(Res.string.profile_theme_dark)
    ThemeMode.SYSTEM -> stringResource(Res.string.profile_theme_system)
}

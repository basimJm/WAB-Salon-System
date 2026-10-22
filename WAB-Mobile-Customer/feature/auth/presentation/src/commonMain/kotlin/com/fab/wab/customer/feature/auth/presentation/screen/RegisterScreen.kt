package com.fab.wab.customer.feature.auth.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.brand.AppLogo
import com.fab.wab.customer.designsystem.components.feedback.AppErrorState
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.auth.presentation.analytics.RegisterAnalytics
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract.UiAction
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract.UiState
import com.fab.wab.customer.feature.auth.presentation.resources.Res
import com.fab.wab.customer.feature.auth.presentation.resources.register_have_account
import com.fab.wab.customer.feature.auth.presentation.resources.register_login_link
import com.fab.wab.customer.feature.auth.presentation.resources.register_subtitle
import com.fab.wab.customer.feature.auth.presentation.resources.register_title
import org.jetbrains.compose.resources.stringResource

/**
 * S12 as in `design/WAB 01 Auth.dc.html` (`on.register`): hero gradient, `padding:54px 22px 26px`, back pill +
 * language/theme pills, logo 54 beside title 21 / subtitle 12.5 (`margin:18px 0 20px`), the form card
 * (`padding:20px 16px`, gap 14, Register inside), "I already have an account – Log in" (margin-top 18) and the
 * legal links (margin-top 16).
 */
@Composable
fun RegisterScreen(
    state: UiState,
    onAction: (UiAction) -> Unit,
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = null,
) {
    TrackScreen(RegisterAnalytics.SCREEN)
    AppScreen(modifier = modifier) {
        AuthScrollColumn(contentPadding = authScreenPadding(), horizontalAlignment = Alignment.CenterHorizontally) {
            AuthTopIcons(
                themeMode = state.themeMode,
                onLanguageToggle = { onAction(UiAction.OnLanguageToggle) },
                onThemeToggle = { onAction(UiAction.OnThemeToggle) },
                onBack = onBack ?: { onAction(UiAction.OnLoginClick) },
            )
            RegisterHeader(Modifier.padding(top = AuthDesign.registerHeaderTop, bottom = AuthDesign.registerHeaderBottom))
            AuthCard(
                modifier = Modifier.widthIn(max = AppTheme.sizes.sheetMaxWidth),
                verticalPadding = AuthDesign.registerCardVertical,
                horizontalPadding = AuthDesign.registerCardHorizontal,
            ) {
                if (state.loadError != null) {
                    AppErrorState(onRetry = { onAction(UiAction.OnRetryLoad) }, message = state.loadError)
                } else {
                    RegisterForm(state, onAction)
                }
            }
            AuthFooterLink(
                text = stringResource(Res.string.register_have_account),
                linkText = stringResource(Res.string.register_login_link),
                onClick = { onAction(UiAction.OnLoginClick) },
                modifier = Modifier.padding(top = AuthDesign.registerFooterTop),
            )
            AuthLegalLinks(
                onLegalClick = { onAction(UiAction.OnLegalClick(it)) },
                modifier = Modifier.padding(top = AuthDesign.registerLegalTop),
            )
        }
    }
    if (state.pickerOpen) {
        AuthCountrySheet(
            countries = state.countries.map { it.toUi() },
            selectedCode = state.country?.code,
            onSelect = { onAction(UiAction.OnCountrySelect(it.code)) },
            onDismiss = { onAction(UiAction.OnPickerDismiss) },
        )
    }
}

@Composable
private fun RegisterHeader(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12),
    ) {
        AppLogo(size = AuthDesign.registerLogo)
        Column {
            AppText(
                text = stringResource(Res.string.register_title),
                style = AppTheme.typography.headlineMedium.copy(
                    fontSize = AuthDesign.cardTitleSize,
                    lineHeight = AuthDesign.cardTitleLineHeight,
                    fontWeight = FontWeight.Bold,
                ),
            )
            AppText(
                text = stringResource(Res.string.register_subtitle),
                style = AppTheme.typography.bodySmall.copy(fontSize = AuthDesign.registerSubtitleSize),
                color = AppTheme.colors.muted,
            )
        }
    }
}

package com.fab.wab.customer.feature.auth.presentation.screen

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.brand.AppBrandHeader
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.feedback.AppErrorState
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.auth.presentation.analytics.LoginAnalytics
import com.fab.wab.customer.feature.auth.presentation.controller.contract.LoginContract.UiAction
import com.fab.wab.customer.feature.auth.presentation.controller.contract.LoginContract.UiState
import com.fab.wab.customer.feature.auth.presentation.resources.Res
import com.fab.wab.customer.feature.auth.presentation.resources.login_button
import com.fab.wab.customer.feature.auth.presentation.resources.login_no_account
import com.fab.wab.customer.feature.auth.presentation.resources.login_phone_error
import com.fab.wab.customer.feature.auth.presentation.resources.login_phone_label
import com.fab.wab.customer.feature.auth.presentation.resources.login_phone_placeholder
import com.fab.wab.customer.feature.auth.presentation.resources.login_register_now
import com.fab.wab.customer.feature.auth.presentation.resources.login_subtitle
import com.fab.wab.customer.feature.auth.presentation.resources.login_welcome
import org.jetbrains.compose.resources.stringResource

/**
 * S11 as in `design/WAB 01 Auth.dc.html` (`on.login`): hero gradient, `padding:54px 22px 26px`, language + theme
 * pills at the end, brand header (logo 86), the card (welcome, subtitle, phone label + field + error, Log in),
 * "no account? Register", a flexible gap and the legal links at the bottom.
 */
@Composable
fun LoginScreen(
    state: UiState,
    onAction: (UiAction) -> Unit,
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = null,
) {
    TrackScreen(LoginAnalytics.SCREEN)
    AppScreen(modifier = modifier) {
        AuthScrollColumn(
            contentPadding = authScreenPadding(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            AuthTopIcons(
                themeMode = state.themeMode,
                onLanguageToggle = { onAction(UiAction.OnLanguageToggle) },
                onThemeToggle = { onAction(UiAction.OnThemeToggle) },
                onBack = onBack,
            )
            AppBrandHeader(
                modifier = Modifier.padding(top = AuthDesign.brandTop, bottom = AuthDesign.brandBottom),
                size = AuthDesign.loginLogo,
            )
            LoginCard(state, onAction, Modifier.widthIn(max = AppTheme.sizes.sheetMaxWidth))
            AuthFooterLink(
                text = stringResource(Res.string.login_no_account),
                linkText = stringResource(Res.string.login_register_now),
                onClick = { onAction(UiAction.OnRegisterClick) },
                modifier = Modifier.padding(top = AuthDesign.loginFooterTop),
            )
            Spacer(Modifier.weight(1f).defaultMinSize(minHeight = AuthDesign.loginLegalMin))
            AuthLegalLinks(onLegalClick = { onAction(UiAction.OnLegalClick(it)) })
        }
    }
    LoginOverlays(state, onAction)
}

@Composable
private fun LoginCard(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val typography = AppTheme.typography
    AuthCard(modifier = modifier) {
        Column {
            AppText(
                text = stringResource(Res.string.login_welcome),
                style = typography.headlineMedium.copy(
                    fontSize = AuthDesign.cardTitleSize,
                    lineHeight = AuthDesign.cardTitleLineHeight,
                    fontWeight = FontWeight.Bold,
                ),
            )
            AuthGap(AppTheme.spacing.space4)
            AppText(
                text = stringResource(Res.string.login_subtitle),
                style = typography.bodyMedium.copy(fontSize = AuthDesign.subtitleSize, lineHeight = AuthDesign.subtitleLineHeight),
                color = AppTheme.colors.muted,
            )
            AuthGap(AppTheme.spacing.space20)
            if (state.countriesError != null) {
                AppErrorState(onRetry = { onAction(UiAction.OnRetryCountries) }, message = state.countriesError)
            } else {
                AuthFieldBlock(
                    label = stringResource(Res.string.login_phone_label),
                    error = if (state.showNumberError) stringResource(Res.string.login_phone_error) else null,
                ) {
                    AuthPhoneField(
                        value = state.number,
                        onValueChange = { onAction(UiAction.OnNumberChange(it)) },
                        country = state.country?.toUi(),
                        onCountryClick = { onAction(UiAction.OnCountryClick) },
                        placeholder = stringResource(Res.string.login_phone_placeholder),
                        error = state.showNumberError,
                        enabled = !state.countriesLoading,
                    )
                }
            }
            AuthGap(AuthDesign.loginButtonTop)
            AppPrimaryButton(
                text = stringResource(Res.string.login_button),
                onClick = { onAction(UiAction.OnLoginClick) },
                modifier = Modifier.fillMaxWidth(),
                enabled = state.canSubmit,
                loading = state.submitting,
            )
        }
    }
}

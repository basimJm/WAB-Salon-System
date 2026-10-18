package com.fab.wab.customer.feature.auth.presentation.screen

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.ui.utils.LocalDarkTheme
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.button.AppTextButton
import com.fab.wab.customer.designsystem.components.card.AppCard
import com.fab.wab.customer.designsystem.components.feedback.AppErrorState
import com.fab.wab.customer.designsystem.components.form.AppPhoneField
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
import com.fab.wab.customer.feature.auth.presentation.resources.login_register_now
import com.fab.wab.customer.feature.auth.presentation.resources.login_subtitle
import com.fab.wab.customer.feature.auth.presentation.resources.login_welcome
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.ic_app_logo_dark
import com.fab.wab.customer.designsystem.resources.ic_app_logo_light

/** S11: logo, language + theme icons, centered card (country + number + Log in), register link, legal links. */
@Composable
fun LoginScreen(
    state: UiState,
    onAction: (UiAction) -> Unit,
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = null,
) {
    TrackScreen(LoginAnalytics.SCREEN)
    val spacing = AppTheme.spacing
    val logo = if (LocalDarkTheme.current) CoreRes.drawable.ic_app_logo_dark else CoreRes.drawable.ic_app_logo_light
    AppScreen(modifier = modifier) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(spacing.space16),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(spacing.space16),
        ) {
            AuthTopIcons(
                themeMode = state.themeMode,
                onLanguageToggle = { onAction(UiAction.OnLanguageToggle) },
                onThemeToggle = { onAction(UiAction.OnThemeToggle) },
                onBack = onBack,
            )
            Image(painter = painterResource(logo), contentDescription = null, modifier = Modifier.size(AppTheme.sizes.logo))
            LoginCard(state, onAction, Modifier.widthIn(max = AppTheme.sizes.sheetMaxWidth))
            Row(verticalAlignment = Alignment.CenterVertically) {
                AppText(text = stringResource(Res.string.login_no_account), color = AppTheme.colors.muted)
                AppTextButton(text = stringResource(Res.string.login_register_now), onClick = { onAction(UiAction.OnRegisterClick) })
            }
            AuthLegalLinks(onLegalClick = { onAction(UiAction.OnLegalClick(it)) })
        }
    }
    LoginOverlays(state, onAction)
}


@Composable
private fun LoginCard(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    AppCard(modifier = modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space12)) {
            AppText(text = stringResource(Res.string.login_welcome), style = AppTheme.typography.headlineSmall)
            AppText(text = stringResource(Res.string.login_subtitle), style = AppTheme.typography.bodyMedium, color = AppTheme.colors.muted)
            if (state.countriesError != null) {
                AppErrorState(onRetry = { onAction(UiAction.OnRetryCountries) }, message = state.countriesError)
            } else {
                AppPhoneField(
                    value = state.number,
                    onValueChange = { onAction(UiAction.OnNumberChange(it)) },
                    country = state.country?.toUi(),
                    onCountryClick = { onAction(UiAction.OnCountryClick) },
                    label = stringResource(Res.string.login_phone_label),
                    error = if (state.showNumberError) stringResource(Res.string.login_phone_error) else null,
                    enabled = !state.countriesLoading,
                )
            }
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


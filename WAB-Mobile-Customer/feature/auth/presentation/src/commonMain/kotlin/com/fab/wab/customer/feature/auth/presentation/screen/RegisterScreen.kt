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
import com.fab.wab.customer.designsystem.components.form.AppCountryPicker
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.auth.presentation.analytics.RegisterAnalytics
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract.UiAction
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract.UiState
import com.fab.wab.customer.feature.auth.presentation.resources.Res
import com.fab.wab.customer.feature.auth.presentation.resources.register_button
import com.fab.wab.customer.feature.auth.presentation.resources.register_have_account
import com.fab.wab.customer.feature.auth.presentation.resources.register_login_link
import com.fab.wab.customer.feature.auth.presentation.resources.register_subtitle
import com.fab.wab.customer.feature.auth.presentation.resources.register_title
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.ic_app_logo_dark
import com.fab.wab.customer.designsystem.resources.ic_app_logo_light

/** S12: login chrome + back, title block, scrollable form card, Register, "I already have an account", legal links. */
@Composable
fun RegisterScreen(
    state: UiState,
    onAction: (UiAction) -> Unit,
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = null,
) {
    TrackScreen(RegisterAnalytics.SCREEN)
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
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
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
                Image(painter = painterResource(logo), contentDescription = null, modifier = Modifier.size(AppTheme.sizes.avatar))
                Column {
                    AppText(text = stringResource(Res.string.register_title), style = AppTheme.typography.headlineSmall)
                    AppText(
                        text = stringResource(Res.string.register_subtitle),
                        style = AppTheme.typography.bodyMedium,
                        color = colors.muted,
                    )
                }
            }
            AppCard(modifier = Modifier.fillMaxWidth().widthIn(max = AppTheme.sizes.sheetMaxWidth)) {
                if (state.loadError != null) {
                    AppErrorState(onRetry = { onAction(UiAction.OnRetryLoad) }, message = state.loadError)
                } else {
                    RegisterForm(state, onAction)
                }
            }
            AppPrimaryButton(
                text = stringResource(Res.string.register_button),
                onClick = { onAction(UiAction.OnRegisterClick) },
                modifier = Modifier.fillMaxWidth().widthIn(max = AppTheme.sizes.sheetMaxWidth),
                enabled = state.canSubmit,
                loading = state.submitting,
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                AppText(text = stringResource(Res.string.register_have_account), color = colors.muted)
                AppTextButton(text = stringResource(Res.string.register_login_link), onClick = { onAction(UiAction.OnLoginClick) })
            }
            AuthLegalLinks(onLegalClick = { onAction(UiAction.OnLegalClick(it)) })
        }
    }
    if (state.pickerOpen) {
        AppCountryPicker(
            countries = state.countries.map { it.toUi() },
            selectedCode = state.country?.code,
            onSelect = { onAction(UiAction.OnCountrySelect(it.code)) },
            onDismiss = { onAction(UiAction.OnPickerDismiss) },
        )
    }
}

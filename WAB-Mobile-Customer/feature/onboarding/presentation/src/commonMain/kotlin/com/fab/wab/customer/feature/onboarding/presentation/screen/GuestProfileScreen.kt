package com.fab.wab.customer.feature.onboarding.presentation.screen

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.ui.utils.LocalDarkTheme
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.card.AppChoiceCard
import com.fab.wab.customer.designsystem.components.form.AppKeyboards
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.textfield.AppTextField
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.onboarding.presentation.analytics.GuestProfileAnalytics
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.GuestProfileContract.UiAction
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.GuestProfileContract.UiState
import com.fab.wab.customer.feature.onboarding.presentation.resources.Res
import com.fab.wab.customer.feature.onboarding.presentation.resources.guest_continue
import com.fab.wab.customer.feature.onboarding.presentation.resources.guest_gender_label
import com.fab.wab.customer.feature.onboarding.presentation.resources.guest_gender_man
import com.fab.wab.customer.feature.onboarding.presentation.resources.guest_gender_woman
import com.fab.wab.customer.feature.onboarding.presentation.resources.guest_nickname_error
import com.fab.wab.customer.feature.onboarding.presentation.resources.guest_nickname_label
import com.fab.wab.customer.feature.onboarding.presentation.resources.guest_nickname_placeholder
import com.fab.wab.customer.feature.onboarding.presentation.resources.guest_subtitle
import com.fab.wab.customer.feature.onboarding.presentation.resources.guest_title
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.ic_app_logo_dark
import com.fab.wab.customer.designsystem.resources.ic_app_logo_light

/** S02: nickname + gender, Continue enabled only when both are valid; nothing here leaves the device. */
@Composable
fun GuestProfileScreen(
    state: UiState,
    onAction: (UiAction) -> Unit,
    modifier: Modifier = Modifier,
) {
    TrackScreen(GuestProfileAnalytics.SCREEN)
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    val logo = if (LocalDarkTheme.current) CoreRes.drawable.ic_app_logo_dark else CoreRes.drawable.ic_app_logo_light
    AppScreen(modifier = modifier) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = spacing.space24, vertical = spacing.space24),
            verticalArrangement = Arrangement.spacedBy(spacing.space16),
        ) {
            Image(painter = painterResource(logo), contentDescription = null, modifier = Modifier.size(AppTheme.sizes.logo))
            AppText(text = stringResource(Res.string.guest_title), style = AppTheme.typography.headlineMedium)
            AppText(text = stringResource(Res.string.guest_subtitle), style = AppTheme.typography.bodyMedium, color = colors.muted)
            AppTextField(
                value = state.nickname,
                onValueChange = { onAction(UiAction.OnNicknameChange(it)) },
                label = stringResource(Res.string.guest_nickname_label),
                placeholder = stringResource(Res.string.guest_nickname_placeholder),
                error = if (state.nicknameError) stringResource(Res.string.guest_nickname_error) else null,
                keyboardOptions = AppKeyboards.name,
                modifier = Modifier.fillMaxWidth(),
            )
            AppText(text = stringResource(Res.string.guest_gender_label), style = AppTheme.typography.labelLarge, color = colors.accent)
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
                AppChoiceCard(
                    label = stringResource(Res.string.guest_gender_man),
                    selected = state.gender == Gender.MALE,
                    onClick = { onAction(UiAction.OnGenderSelect(Gender.MALE)) },
                    modifier = Modifier.weight(1f),
                    icon = AppIcons.Man,
                )
                AppChoiceCard(
                    label = stringResource(Res.string.guest_gender_woman),
                    selected = state.gender == Gender.FEMALE,
                    onClick = { onAction(UiAction.OnGenderSelect(Gender.FEMALE)) },
                    modifier = Modifier.weight(1f),
                    icon = AppIcons.Woman,
                )
            }
            Spacer(Modifier.height(spacing.space8))
            AppPrimaryButton(
                text = stringResource(Res.string.guest_continue),
                onClick = { onAction(UiAction.OnContinueClick) },
                modifier = Modifier.fillMaxWidth().align(Alignment.CenterHorizontally),
                enabled = state.canContinue,
                loading = state.saving,
            )
        }
    }
}

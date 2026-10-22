package com.fab.wab.customer.feature.onboarding.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.designsystem.components.brand.AppLogo
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.card.AppChoiceCard
import com.fab.wab.customer.designsystem.components.form.AppKeyboards
import com.fab.wab.customer.designsystem.components.glass.glassBackground
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.text.AppText
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
import org.jetbrains.compose.resources.stringResource

/**
 * S02 as in `design/WAB 01 Auth.dc.html` (`on.nick`): hero gradient, `padding:74px 24px 34px`, logo 64, title 24,
 * subtitle 13.5, accent label + 52 dp field (+ error), gender label (`margin:22px 0 8px`) + two 96 dp choice
 * cards, a flexible gap, then Continue (enabled only when both values are valid). Nothing here leaves the device.
 */
@Composable
fun GuestProfileScreen(
    state: UiState,
    onAction: (UiAction) -> Unit,
    modifier: Modifier = Modifier,
) {
    TrackScreen(GuestProfileAnalytics.SCREEN)
    val colors = AppTheme.colors
    AppScreen(modifier = modifier) {
        BoxWithConstraints(Modifier.fillMaxSize().background(onboardingHeroBrush())) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .heightIn(min = maxHeight)
                    .padding(
                        start = OnboardingDesign.screenHorizontal,
                        end = OnboardingDesign.screenHorizontal,
                        top = OnboardingDesign.nickTop,
                        bottom = OnboardingDesign.screenBottom,
                    ),
            ) {
                AppLogo(size = OnboardingDesign.logo, modifier = Modifier.padding(bottom = OnboardingDesign.logoBottom))
                AppText(
                    text = stringResource(Res.string.guest_title),
                    style = AppTheme.typography.headlineMedium.copy(
                        fontSize = OnboardingDesign.nickTitleSize,
                        lineHeight = OnboardingDesign.nickTitleLineHeight,
                        fontWeight = FontWeight.Bold,
                    ),
                    modifier = Modifier.padding(bottom = OnboardingDesign.nickTitleBottom),
                )
                AppText(
                    text = stringResource(Res.string.guest_subtitle),
                    style = AppTheme.typography.bodyMedium.copy(
                        fontSize = OnboardingDesign.nickSubtitleSize,
                        lineHeight = OnboardingDesign.nickSubtitleLineHeight,
                    ),
                    color = colors.muted,
                    modifier = Modifier.padding(bottom = OnboardingDesign.nickSubtitleBottom),
                )
                FieldLabel(stringResource(Res.string.guest_nickname_label))
                NicknameField(state, onAction)
                if (state.nicknameError) {
                    AppText(
                        text = stringResource(Res.string.guest_nickname_error),
                        style = AppTheme.typography.bodySmall.copy(fontSize = OnboardingDesign.errorSize),
                        color = colors.danger,
                        modifier = Modifier.padding(top = OnboardingDesign.errorTop),
                    )
                }
                FieldLabel(stringResource(Res.string.guest_gender_label), Modifier.padding(top = OnboardingDesign.genderLabelTop))
                GenderCards(state, onAction)
                Spacer(Modifier.weight(1f).heightIn(min = AppTheme.spacing.space16))
                AppPrimaryButton(
                    text = stringResource(Res.string.guest_continue),
                    onClick = { onAction(UiAction.OnContinueClick) },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = state.canContinue,
                    loading = state.saving,
                )
            }
        }
    }
}

/** `font-size:12.5px;font-weight:600;color:var(--accent);margin-bottom:8px`. */
@Composable
private fun FieldLabel(text: String, modifier: Modifier = Modifier) {
    AppText(
        text = text,
        modifier = modifier.padding(bottom = OnboardingDesign.labelBottom),
        style = AppTheme.typography.labelMedium.copy(fontSize = OnboardingDesign.labelSize),
        color = AppTheme.colors.accent,
    )
}

/** `fs.nick` = `field(nickErr)`: 52 dp, radius 14, 1.5 dp line/danger border, `padding:0 14px`, 15 px text. */
@Composable
private fun NicknameField(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    val textStyle = AppTheme.typography.bodyLarge.copy(fontSize = OnboardingDesign.fieldTextSize, color = colors.ink)
    val placeholder = stringResource(Res.string.guest_nickname_placeholder)
    BasicTextField(
        value = state.nickname,
        onValueChange = { onAction(UiAction.OnNicknameChange(it)) },
        modifier = modifier.fillMaxWidth(),
        singleLine = true,
        textStyle = textStyle,
        keyboardOptions = AppKeyboards.name,
        cursorBrush = SolidColor(colors.accent),
        decorationBox = { inner ->
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(AppTheme.sizes.fieldHeight)
                    .clip(shape)
                    .glassBackground(AppTheme.glass, shape, stateBorder = if (state.nicknameError) colors.danger else Color.Unspecified)
                    .padding(horizontal = AppTheme.spacing.space14),
                contentAlignment = Alignment.CenterStart,
            ) {
                if (state.nickname.isEmpty()) AppText(text = placeholder, style = textStyle, color = colors.faint, maxLines = 1)
                inner()
            }
        },
    )
}

/** `grid-template-columns:1fr 1fr;gap:12px`, 96 dp cards (`AppChoiceCard`: icon over label, soft fill when selected). */
@Composable
private fun GenderCards(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    Row(modifier = modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(OnboardingDesign.genderGap)) {
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
}

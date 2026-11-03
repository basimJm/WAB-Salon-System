package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.designsystem.components.card.AppChoiceCard
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.textfield.AppTextField
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush
import com.fab.wab.customer.designsystem.utils.softShadow
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_bride_hint
import com.fab.wab.customer.feature.booking.presentation.resources.booking_bride_toggle
import com.fab.wab.customer.feature.booking.presentation.resources.booking_gender_error
import com.fab.wab.customer.feature.booking.presentation.resources.booking_gender_label
import com.fab.wab.customer.feature.booking.presentation.resources.booking_gender_man
import com.fab.wab.customer.feature.booking.presentation.resources.booking_gender_woman
import com.fab.wab.customer.feature.booking.presentation.resources.booking_name_error
import com.fab.wab.customer.feature.booking.presentation.resources.booking_name_label
import com.fab.wab.customer.feature.booking.presentation.resources.booking_name_placeholder
import com.fab.wab.customer.feature.booking.presentation.resources.booking_step_person_title
import com.fab.wab.customer.feature.booking.presentation.resources.booking_who_companion
import com.fab.wab.customer.feature.booking.presentation.resources.booking_who_companion_any
import com.fab.wab.customer.feature.booking.presentation.resources.booking_who_main
import org.jetbrains.compose.resources.stringResource

/**
 * Step 0 (`st.s0`): title `mb 6`, subtitle `13px muted mb 22` (main / companion text), label `12.5px 600 accent mb 8`,
 * 52 dp field, and for women's salons the bride toggle card `mt 16`.
 */
@Composable
internal fun PersonStep(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(start = spacing.space20, top = spacing.space4, end = spacing.space20, bottom = spacing.space20),
    ) {
        StepTitle(text = stringResource(Res.string.booking_step_person_title), modifier = Modifier.padding(bottom = spacing.space6))
        AppText(
            text = stringResource(
                when {
                    !state.isCompanionFlow -> Res.string.booking_who_main
                    state.asksGender -> Res.string.booking_who_companion_any
                    else -> Res.string.booking_who_companion
                },
            ),
            modifier = Modifier.padding(bottom = spacing.space20),
            style = AppTheme.typography.bodyMedium,
            color = colors.muted,
        )
        AppText(
            text = stringResource(Res.string.booking_name_label),
            modifier = Modifier.padding(bottom = spacing.space8),
            style = AppTheme.typography.labelMedium,
            color = colors.accent,
        )
        AppTextField(
            value = state.person.name,
            onValueChange = { onAction(UiAction.OnNameChange(it)) },
            modifier = Modifier.fillMaxWidth(),
            placeholder = stringResource(Res.string.booking_name_placeholder),
            error = if (state.nameError) stringResource(Res.string.booking_name_error) else null,
        )
        if (state.asksGender) {
            PersonGenderCards(state, onAction, Modifier.padding(top = spacing.space16))
        }
        if (state.showsBride) {
            BrideToggleCard(
                checked = state.person.isBride,
                onCheckedChange = { onAction(UiAction.OnBrideChange(it)) },
                modifier = Modifier.padding(top = spacing.space16),
            )
        }
        ReferenceImageSection(state, onAction, Modifier.padding(top = spacing.space16))
    }
}

/** BOTH salons and clinics (§5.19): the person's gender, as the onboarding cards; required before continuing. */
@Composable
private fun PersonGenderCards(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    Column(modifier = modifier.fillMaxWidth()) {
        AppText(
            text = stringResource(Res.string.booking_gender_label),
            modifier = Modifier.padding(bottom = spacing.space8),
            style = AppTheme.typography.labelMedium,
            color = AppTheme.colors.accent,
        )
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
            AppChoiceCard(
                label = stringResource(Res.string.booking_gender_man),
                selected = state.personGender == Gender.MALE,
                onClick = { onAction(UiAction.OnGenderChange(Gender.MALE)) },
                modifier = Modifier.weight(1f),
                icon = AppIcons.Man,
            )
            AppChoiceCard(
                label = stringResource(Res.string.booking_gender_woman),
                selected = state.personGender == Gender.FEMALE,
                onClick = { onAction(UiAction.OnGenderChange(Gender.FEMALE)) },
                modifier = Modifier.weight(1f),
                icon = AppIcons.Woman,
            )
        }
        if (state.genderError) {
            AppText(
                text = stringResource(Res.string.booking_gender_error),
                modifier = Modifier.padding(top = spacing.space6),
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colors.danger,
            )
        }
    }
}

/**
 * Design bride card: `gap:12px;padding:16px;border-radius:18px;border:1.5px solid var(--line);background:var(--surface)`,
 * 44 dp icon box (`radius 14px`, pink tint), title `14.5px 700` + hint `12px muted`, custom 48×28 switch at End.
 */
@Composable
private fun BrideToggleCard(checked: Boolean, onCheckedChange: (Boolean) -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val shape = roundedShape(BookingDesignConstants.brideCardRadius)
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .background(colors.surface)
            .border(AppTheme.sizes.borderWidth, colors.line, shape)
            .toggleable(value = checked, role = Role.Switch, onValueChange = onCheckedChange)
            .padding(spacing.space16),
        horizontalArrangement = Arrangement.spacedBy(spacing.space12),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(BookingDesignConstants.brideIconBox)
                .background(colors.dangerContainer.copy(alpha = BookingDesignConstants.BRIDE_TINT_ALPHA), AppTheme.shapes.medium),
            contentAlignment = Alignment.Center,
        ) {
            Icon(AppIcons.Bride, contentDescription = null, tint = colors.onDangerContainer, modifier = Modifier.size(AppTheme.sizes.icon))
        }
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(spacing.space2)) {
            AppText(text = stringResource(Res.string.booking_bride_toggle), style = AppTheme.typography.titleSmall)
            AppText(text = stringResource(Res.string.booking_bride_hint), style = AppTheme.typography.bodySmall, color = colors.muted)
        }
        BrideSwitch(checked)
    }
}

/** Design `brideTrack` / `brideKnob`: 48×28 track (`radius 14px;padding 3px`, gradient on / line off) with a 22 dp white knob. */
@Composable
private fun BrideSwitch(checked: Boolean, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val track = Modifier
        .size(BookingDesignConstants.switchTrackWidth, BookingDesignConstants.switchTrackHeight)
        .let { if (checked) it.brandBackground(brandBrush(), AppTheme.shapes.pill) else it.background(colors.line, AppTheme.shapes.pill) }
    Box(
        modifier = modifier.then(track).padding(BookingDesignConstants.switchTrackPadding),
        contentAlignment = if (checked) Alignment.CenterEnd else Alignment.CenterStart,
    ) {
        Box(
            Modifier
                .size(BookingDesignConstants.switchKnob)
                .softShadow(AppTheme.elevation.card, colors.shadow.copy(alpha = AppTheme.elevation.cardShadowAlpha), AppTheme.shapes.circle)
                .background(colors.onGradient, AppTheme.shapes.circle),
        )
    }
}

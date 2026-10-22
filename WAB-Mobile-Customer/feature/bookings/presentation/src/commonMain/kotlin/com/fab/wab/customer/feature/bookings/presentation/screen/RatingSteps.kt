package com.fab.wab.customer.feature.bookings.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import com.fab.wab.customer.designsystem.components.avatar.AppAvatar
import com.fab.wab.customer.designsystem.components.rating.AppRatingInput
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.bookings.domain.model.RatingStep
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.RatingContract.UiAction
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.RatingContract.UiState
import com.fab.wab.customer.feature.bookings.presentation.resources.Res
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_comment_hint
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_salon_step
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_salon_unknown
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_staff_step
import com.fab.wab.customer.feature.bookings.presentation.resources.rating_step_of
import org.jetbrains.compose.resources.stringResource

/**
 * Design `rateSalon`: centred column, `padding:10px 20px 20px`; accent 12 px bold "Step 1 of N"; 84 px / 22 px-radius salon
 * image; Playfair 20 px "How was the salon?"; 13 px muted salon name; five 40 px stars (LTR, 8 px gap); 120 px comment box.
 */
@Composable
internal fun SalonStep(state: UiState, step: RatingStep.Salon, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    val salonName = step.salonName ?: stringResource(Res.string.rating_salon_unknown)
    Column(
        modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(top = spacing.space10, bottom = spacing.space20),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        StepLabel(state, Modifier.padding(bottom = BookingsDesign.salonStepBottomPadding))
        SalonThumb(
            name = salonName,
            imageUrl = null,
            modifier = Modifier.padding(bottom = spacing.space14),
            size = BookingsDesign.ratingImage,
            shape = AppTheme.shapes.extraLarge,
        )
        StepHeading(stringResource(Res.string.rating_salon_step), Modifier.padding(bottom = spacing.space6))
        AppText(
            text = salonName,
            style = AppTheme.typography.bodyMedium.copy(fontSize = BookingsDesign.fontBody),
            color = AppTheme.colors.muted,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(bottom = spacing.space20),
        )
        AppRatingInput(
            value = state.rating,
            onValueChange = { onAction(UiAction.OnRatingChange(it)) },
            modifier = Modifier.padding(bottom = spacing.space20),
            starSize = BookingsDesign.starLarge,
        )
        CommentField(
            value = state.comment,
            onValueChange = { onAction(UiAction.OnCommentChange(it)) },
            height = BookingsDesign.commentHeight,
            shape = AppTheme.shapes.medium,
            fontSize = AppTheme.typography.bodyMedium.fontSize,
            singleLine = false,
        )
    }
}

/**
 * Design `rateStaff`: accent "Step 2 of N", Playfair "Rate who served you", then a bordered 18 px card per member with a 48 px
 * round avatar, bold 14.5 px name, 12 px muted service, 30 px stars (6 px gap) and a 44 px / 12 px-radius comment input.
 * The flow rates one member per step, so the card of the current member is shown.
 */
@Composable
internal fun StaffStep(state: UiState, step: RatingStep.Staff, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    Column(
        modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(top = spacing.space10, bottom = spacing.space20),
        verticalArrangement = Arrangement.spacedBy(spacing.space12),
    ) {
        StepLabel(state, Modifier.fillMaxWidth())
        StepHeading(stringResource(Res.string.rating_staff_step), Modifier.fillMaxWidth().padding(bottom = spacing.space4))
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .border(AppTheme.sizes.hairline, AppTheme.colors.line, bookingCardShape)
                .padding(spacing.space16),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(spacing.space12),
                modifier = Modifier.padding(bottom = spacing.space12),
            ) {
                AppAvatar(name = step.memberName, size = BookingsDesign.staffAvatar)
                AppText(
                    text = step.memberName,
                    style = AppTheme.typography.titleSmall.copy(fontSize = BookingsDesign.fontTitle, fontWeight = FontWeight.Bold),
                )
            }
            AppRatingInput(
                value = state.rating,
                onValueChange = { onAction(UiAction.OnRatingChange(it)) },
                modifier = Modifier.padding(bottom = spacing.space10),
                starSize = BookingsDesign.starSmall,
            )
            CommentField(
                value = state.comment,
                onValueChange = { onAction(UiAction.OnCommentChange(it)) },
                height = BookingsDesign.staffCommentHeight,
                shape = RoundedCornerShape(BookingsDesign.staffCommentRadius),
                fontSize = BookingsDesign.fontBodyPlus,
                singleLine = true,
            )
        }
    }
}

@Composable
private fun StepLabel(state: UiState, modifier: Modifier = Modifier) {
    AppText(
        text = stringResource(Res.string.rating_step_of, state.stepIndex + 1, state.steps.size),
        style = AppTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
        color = AppTheme.colors.accent,
        textAlign = TextAlign.Center,
        modifier = modifier,
    )
}

@Composable
private fun StepHeading(text: String, modifier: Modifier = Modifier) {
    AppText(
        text = text,
        style = AppTheme.typography.headlineSmall.copy(fontSize = BookingsDesign.fontHeading, fontWeight = FontWeight.Bold),
        textAlign = TextAlign.Center,
        modifier = modifier,
    )
}

/** Design comment inputs: `border:1.5px solid var(--line);background:var(--surface)`, placeholder in faint. */
@Composable
private fun CommentField(
    value: String,
    onValueChange: (String) -> Unit,
    height: Dp,
    shape: Shape,
    fontSize: TextUnit,
    singleLine: Boolean,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val style = AppTheme.typography.bodyMedium.copy(fontSize = fontSize)
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        textStyle = style.copy(color = colors.ink),
        singleLine = singleLine,
        cursorBrush = SolidColor(colors.accent),
        decorationBox = { inner ->
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(height)
                    .background(colors.surface, shape)
                    .border(AppTheme.sizes.borderWidth, colors.line, shape)
                    .padding(
                        horizontal = if (singleLine) spacing.space12 else spacing.space14,
                        vertical = if (singleLine) spacing.space0 else spacing.space12,
                    ),
                contentAlignment = if (singleLine) Alignment.CenterStart else Alignment.TopStart,
            ) {
                if (value.isEmpty()) {
                    AppText(text = stringResource(Res.string.rating_comment_hint), style = style, color = colors.faint, maxLines = 1)
                }
                inner()
            }
        },
    )
}

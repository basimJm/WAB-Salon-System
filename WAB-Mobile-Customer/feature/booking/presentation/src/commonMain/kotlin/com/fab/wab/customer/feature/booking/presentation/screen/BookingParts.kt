package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.Dp
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerBox
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_bride_badge
import org.jetbrains.compose.resources.stringResource

/** Step title: `font-family:'Playfair Display';font-weight:700;font-size:20px`. */
@Composable
internal fun StepTitle(text: String, modifier: Modifier = Modifier) {
    AppText(text = text, modifier = modifier, style = AppTheme.typography.headlineSmall)
}

/**
 * Design `card(sel, dis)`: `display:flex;gap:12px;padding:12px 14px;border-radius:16px;border:1.5px solid
 * (sel ? #A855F7 : var(--line));background:sel ? var(--soft) : var(--card);opacity:dis ? .5 : 1`.
 */
@Composable
internal fun SelectionCard(
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    role: Role = Role.RadioButton,
    fillModifier: Modifier? = null,
    content: @Composable RowScope.() -> Unit,
) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.large
    val fill = fillModifier ?: Modifier.background(if (selected) colors.soft else colors.card)
    Row(
        modifier = modifier
            .fillMaxWidth()
            .alpha(if (enabled) 1f else BookingDesignConstants.DISABLED_CARD_ALPHA)
            .clip(shape)
            .then(fill)
            .border(AppTheme.sizes.borderWidth, if (selected) colors.gradientEnd else colors.line, shape)
            .selectable(selected = selected, enabled = enabled, role = role, onClick = onClick)
            .padding(horizontal = AppTheme.spacing.space14, vertical = AppTheme.spacing.space12),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12),
        verticalAlignment = Alignment.CenterVertically,
        content = content,
    )
}

/** Design `radio(sel)`: `20px` circle, `border:6px solid #6D28D9` when selected, `1.5px solid var(--faint)` otherwise. */
@Composable
internal fun DesignRadio(selected: Boolean, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.circle
    Box(
        modifier = modifier.size(BookingDesignConstants.radioSize).then(
            if (selected) {
                Modifier.border(BookingDesignConstants.radioSelectedBorder, colors.gradientStart, shape)
            } else {
                Modifier.border(AppTheme.sizes.borderWidth, colors.faint, shape)
            },
        ),
    )
}

/** Bride tag: `font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:6px;background:rgba(244,167,196,.3);color:#B83268`. */
@Composable
internal fun BrideTag(modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    AppText(
        text = stringResource(Res.string.booking_bride_badge),
        modifier = modifier
            .background(colors.dangerContainer.copy(alpha = BookingDesignConstants.BRIDE_TAG_ALPHA), AppTheme.shapes.extraSmall)
            .padding(horizontal = BookingDesignConstants.tagPaddingH, vertical = AppTheme.spacing.space2),
        style = AppTheme.typography.labelSmall.copy(
            fontSize = BookingDesignConstants.tagTextSize,
            lineHeight = BookingDesignConstants.tagLineHeight,
        ),
        color = colors.onDangerContainer,
        maxLines = 1,
    )
}

/** Name row shared by the companions and summary cards: `font-weight:700` name + the bride tag with `gap:6px`. */
@Composable
internal fun PersonNameRow(name: String, isBride: Boolean, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppText(text = name, style = AppTheme.typography.titleSmall, maxLines = 1)
        if (isBride) BrideTag()
    }
}

/** `border:1.5px dashed <color>` with the given corner radius (Compose has no dashed border modifier). */
internal fun Modifier.dashedBorder(width: Dp, color: Color, radius: Dp, dash: Dp): Modifier = drawBehind {
    val stroke = width.toPx()
    val dashPx = dash.toPx()
    val inset = stroke * HALF
    drawRoundRect(
        color = color,
        topLeft = Offset(inset, inset),
        size = Size(size.width - stroke, size.height - stroke),
        cornerRadius = CornerRadius(radius.toPx() - inset),
        style = Stroke(width = stroke, pathEffect = PathEffect.dashPathEffect(floatArrayOf(dashPx, dashPx))),
    )
}

/** `border-top:1px dashed var(--line)` divider used by the summary person card. */
@Composable
internal fun DashedDivider(modifier: Modifier = Modifier) {
    val color = AppTheme.colors.line
    val width = AppTheme.sizes.hairline
    val dash = BookingDesignConstants.dashLength
    Box(
        modifier = modifier.fillMaxWidth().height(width).drawBehind {
            drawLine(
                color = color,
                start = Offset(0f, center.y),
                end = Offset(size.width, center.y),
                strokeWidth = width.toPx(),
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(dash.toPx(), dash.toPx())),
            )
        },
    )
}

/** Loading rows of the services / staff steps: `height:74|72px;border-radius:16px;gap:10px` × 5. */
@Composable
internal fun ShimmerRows(rowHeight: Dp, modifier: Modifier = Modifier) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(BookingDesignConstants.shimmerGap)) {
        repeat(SHIMMER_ROWS) {
            AppShimmerBox(modifier = Modifier.fillMaxWidth().height(rowHeight), shape = AppTheme.shapes.large)
        }
    }
}

/** Rounded shape for a design radius that has no shape token (20 / 18 / 12 / 11 / 10 px). */
internal fun roundedShape(radius: Dp) = RoundedCornerShape(radius)

private const val SHIMMER_ROWS = 5
private const val HALF = 0.5f

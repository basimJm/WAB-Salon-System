package com.fab.wab.merchant.designsystem.components.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.designsystem.components.badge.statusColors
import com.fab.wab.merchant.designsystem.components.booking.bookingStatusTone
import com.fab.wab.merchant.designsystem.components.surface.appClickable
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppColors
import com.fab.wab.merchant.designsystem.theme.AppTheme

/** How a block looks for its status: PRD M11 colours by status; the design's dashed pending and faded completed stay. */
data class BlockStyle(val content: Color, val container: Color, val dashed: Boolean, val faded: Boolean)

fun calendarBlockStyle(status: BookingStatus, colors: AppColors): BlockStyle {
    val (content, container) = statusColors(bookingStatusTone(status), colors)
    return when (status) {
        BookingStatus.PENDING -> BlockStyle(content, colors.card, dashed = true, faded = false)
        BookingStatus.COMPLETED -> BlockStyle(content, container, dashed = false, faded = true)
        else -> BlockStyle(content, container, dashed = false, faded = false)
    }
}

private const val DASH_ON = 8f
private const val DASH_OFF = 6f
private const val HATCH_STEP_FACTOR = 2f

/** Hour lines across a column (design `gridBg`). */
fun Modifier.hourGrid(window: TimeWindow, hourHeight: Dp, color: Color): Modifier = drawBehind {
    val step = hourHeight.toPx()
    window.hours.indices.forEach { index -> drawLine(color, Offset(0f, step * index), Offset(size.width, step * index)) }
}

/** Hour labels down the side; [labels] are pre-formatted (12-hour, localized) and aligned with [TimeWindow.hours]. */
@Composable
internal fun TimeColumn(window: TimeWindow, labels: List<String>, hourHeight: Dp, width: Dp) {
    Box(modifier = Modifier.width(width).height(hourHeight * window.lengthHours)) {
        labels.take(window.hours.size).forEachIndexed { index, label ->
            AppText(
                text = label,
                style = AppTheme.typography.labelSmall,
                color = AppTheme.colors.faint,
                // "10:00 ص" wraps onto two lines at large font scales instead of being cut.
                maxLines = TIME_LABEL_LINES,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .offset(y = hourHeight * index)
                    .padding(end = AppTheme.spacing.space6),
            )
        }
    }
}

/** Hatched closed / leave span with its optional label (design `hatch`). */
@Composable
internal fun BoxScope.ShadeBox(shade: CalendarShadeUi, window: TimeWindow, hourHeight: Dp) {
    val (top, height) = spanIn(window, shade.startMinute, shade.endMinute)
    if (height <= 0f) return
    val colors = AppTheme.colors
    val hatch = if (shade.kind == ShadeKind.LEAVE) colors.warningContainer else colors.ink.copy(alpha = AppTheme.alpha.hover)
    val stroke = AppTheme.sizes.calendarHatch
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .offset(y = hourHeight * top)
            .height(hourHeight * height)
            .clip(RectangleShape)
            .drawBehind {
                val step = stroke.toPx() * HATCH_STEP_FACTOR
                var x = -size.height
                while (x < size.width) {
                    drawLine(hatch, Offset(x, size.height), Offset(x + size.height, 0f), strokeWidth = stroke.toPx())
                    x += step
                }
            },
        contentAlignment = Alignment.TopCenter,
    ) {
        val label = shade.label
        if (!label.isNullOrBlank()) {
            AppText(
                text = label,
                style = AppTheme.typography.labelSmall,
                color = colors.faint,
                maxLines = 1,
                modifier = Modifier.padding(AppTheme.spacing.space4),
            )
        }
    }
}

/** A booking block; [compact] (week view) shows only the bride crown. */
@Composable
internal fun BoxScope.BlockBox(block: CalendarBlockUi, window: TimeWindow, hourHeight: Dp, compact: Boolean, onClick: (() -> Unit)?) {
    val (top, height) = spanIn(window, block.startMinute, block.endMinute)
    if (height <= 0f) return
    val colors = AppTheme.colors
    val style = calendarBlockStyle(block.status, colors)
    val shape = if (compact) AppTheme.shapes.extraSmall else AppTheme.shapes.small
    val gap = AppTheme.spacing.space2
    val outline = when {
        block.isBride -> colors.brideEnd
        style.dashed -> style.content
        else -> Color.Unspecified
    }
    val borderWidth = AppTheme.sizes.borderWidth
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .offset(y = hourHeight * top + gap)
            .height(hourHeight * height - gap - gap)
            .padding(horizontal = gap)
            .alpha(if (style.faded) AppTheme.alpha.disabled else 1f)
            .clip(shape)
            .background(style.container)
            .drawBehind {
                if (outline != Color.Unspecified) {
                    val dash = if (style.dashed && !block.isBride) PathEffect.dashPathEffect(floatArrayOf(DASH_ON, DASH_OFF)) else null
                    drawRoundRect(
                        outline,
                        style = Stroke(width = borderWidth.toPx(), pathEffect = dash),
                        cornerRadius = CornerRadius(borderWidth.toPx() * DASH_OFF),
                    )
                }
            }
            .then(if (onClick != null) Modifier.appClickable(role = Role.Button, onClick = onClick) else Modifier)
            .padding(horizontal = AppTheme.spacing.space6, vertical = AppTheme.spacing.space4),
        horizontalAlignment = if (compact) Alignment.CenterHorizontally else Alignment.Start,
    ) {
        if (compact) {
            if (block.isBride) Icon(
                AppIcons.Crown,
                contentDescription = null,
                tint = colors.brideEnd,
                modifier = Modifier.size(AppTheme.sizes.brideIcon),
            )
        } else {
            BlockText(block, style.content)
        }
    }
}

@Composable
private fun BlockText(block: CalendarBlockUi, color: Color) {
    Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2), verticalAlignment = Alignment.CenterVertically) {
        if (block.isBride) Icon(
            AppIcons.Crown,
            contentDescription = null,
            tint = AppTheme.colors.brideEnd,
            modifier = Modifier.size(AppTheme.sizes.brideIcon),
        )
        AppText(
            text = block.customerName,
            style = AppTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
            color = color,
            maxLines = 1,
        )
    }
    AppText(text = block.servicesText, style = AppTheme.typography.labelSmall, color = color, maxLines = 1)
    AppText(text = block.timeText, style = AppTheme.typography.labelSmall, color = color, maxLines = 1)
}

private const val TIME_LABEL_LINES = 2

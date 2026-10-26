package com.fab.wab.merchant.designsystem.components.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.designsystem.components.avatar.AppAvatar
import com.fab.wab.merchant.designsystem.components.booking.bookingStatusLabel
import com.fab.wab.merchant.designsystem.components.feedback.AppEmptyState
import com.fab.wab.merchant.designsystem.components.surface.appClickable
import com.fab.wab.merchant.designsystem.components.surface.cardBackground
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.designsystem.theme.SurfaceTone
import kotlin.math.abs

private const val HALF = 0.5f

/** Empty-day card over the grid (design `dayEmpty`): no bookings, or the salon is closed. */
@Immutable
data class CalendarEmptyUi(val title: String, val body: String)

/**
 * Day view (PRD M11): one column per staff member on a 15-minute-resolution hour grid, shaded closed hours and leave,
 * status-coloured blocks (tap → booking details), the "now" line, swipe to the previous / next day.
 */
@Composable
fun AppCalendarDayView(
    columns: List<CalendarColumnUi>,
    window: TimeWindow,
    hourLabels: List<String>,
    onBlockClick: (String) -> Unit,
    onSwipe: (forward: Boolean) -> Unit,
    modifier: Modifier = Modifier,
    nowMinute: Int? = null,
    empty: CalendarEmptyUi? = null,
    bottomInset: Dp = Dp.Hairline,
) {
    val sizes = AppTheme.sizes
    Box(modifier = modifier.fillMaxSize().swipePages(onSwipe)) {
        Column(modifier = Modifier.fillMaxSize()) {
            StaffHeader(columns, sizes.calendarTimeColumn)
            Box(modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {
                Row(modifier = Modifier.padding(bottom = bottomInset)) {
                    TimeColumn(window, hourLabels, sizes.calendarHour, sizes.calendarTimeColumn)
                    columns.forEach { column -> GridColumn(column, window, compact = false, onBlockClick = onBlockClick) }
                }
                if (nowMinute != null && nowMinute in window.startMinute..window.endMinute) {
                    NowLine(sizes.calendarHour * window.hoursFromStart(nowMinute), sizes.calendarTimeColumn)
                }
            }
        }
        if (empty != null) {
            AppEmptyState(
                title = empty.title,
                message = empty.body,
                modifier = Modifier
                    .align(Alignment.Center)
                    .padding(AppTheme.spacing.space24)
                    .cardBackground(AppTheme.surfaces, AppTheme.shapes.extraLarge, SurfaceTone.Card),
            )
        }
    }
}

/** Week view: one compact column per day (tap → that day), same grid and shading. */
@Composable
fun AppCalendarWeekView(
    days: List<CalendarColumnUi>,
    window: TimeWindow,
    hourLabels: List<String>,
    onDayClick: (String) -> Unit,
    onSwipe: (forward: Boolean) -> Unit,
    modifier: Modifier = Modifier,
    bottomInset: Dp = Dp.Hairline,
) {
    val sizes = AppTheme.sizes
    Box(modifier = modifier.fillMaxSize().swipePages(onSwipe).verticalScroll(rememberScrollState())) {
        Row(modifier = Modifier.padding(bottom = bottomInset)) {
            TimeColumn(window, hourLabels, sizes.calendarHour, sizes.calendarWeekTimeColumn)
            days.forEach { day -> GridColumn(day, window, compact = true, onColumnClick = { onDayClick(day.id) }) }
        }
    }
}

@Composable
private fun RowScope.GridColumn(
    column: CalendarColumnUi,
    window: TimeWindow,
    compact: Boolean,
    onBlockClick: ((String) -> Unit)? = null,
    onColumnClick: (() -> Unit)? = null,
) {
    val colors = AppTheme.colors
    val hour = AppTheme.sizes.calendarHour
    Box(
        modifier = Modifier
            .weight(1f)
            .height(hour * window.lengthHours)
            .background(colors.line.copy(alpha = AppTheme.alpha.hover))
            .padding(start = AppTheme.sizes.hairline)
            .background(colors.background)
            .hourGrid(window, hour, colors.line)
            .then(if (onColumnClick != null) Modifier.appClickable(role = Role.Button, onClick = onColumnClick) else Modifier),
    ) {
        column.shades.forEach { ShadeBox(it, window, hour) }
        column.blocks.forEach { block ->
            BlockBox(block, window, hour, compact, onClick = onBlockClick?.let { click -> { click(block.id) } })
        }
    }
}

@Composable
private fun StaffHeader(columns: List<CalendarColumnUi>, leading: Dp) {
    val spacing = AppTheme.spacing
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = spacing.space6)) {
        Spacer(Modifier.width(leading))
        columns.forEach { column ->
            Column(
                modifier = Modifier.weight(1f),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(spacing.space2),
            ) {
                AppAvatar(name = column.title, size = AppTheme.sizes.avatarSmall)
                AppText(text = column.title, style = AppTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold), maxLines = 1)
                val tag = column.tag
                if (tag != null) {
                    AppText(
                        text = tag,
                        style = AppTheme.typography.labelSmall,
                        color = AppTheme.colors.onWarningContainer,
                        maxLines = 1,
                        modifier = Modifier.background(
                            AppTheme.colors.warningContainer,
                            AppTheme.shapes.extraSmall,
                        ).padding(horizontal = spacing.space4),
                    )
                }
            }
        }
    }
}

@Composable
private fun NowLine(top: Dp, leading: Dp) {
    val colors = AppTheme.colors
    val sizes = AppTheme.sizes
    Box(modifier = Modifier.fillMaxWidth()) {
        Box(modifier = Modifier.fillMaxWidth().offset(
            y = top,
        ).padding(start = leading).height(sizes.calendarNowLine).background(colors.danger))
        Box(
            modifier = Modifier
                .offset(x = leading - sizes.calendarNowDot * HALF, y = top - sizes.calendarNowDot * HALF + sizes.calendarNowLine * HALF)
                .width(sizes.calendarNowDot)
                .height(sizes.calendarNowDot)
                .background(colors.danger, AppTheme.shapes.circle),
        )
    }
}

/** Horizontal swipe pages the calendar; toward the reading end = forward (mirrored in RTL). */
@Composable
private fun Modifier.swipePages(onSwipe: (forward: Boolean) -> Unit): Modifier {
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
    val currentOnSwipe by rememberUpdatedState(onSwipe)
    val threshold = AppTheme.sizes.touchTarget
    return pointerInput(rtl) {
        var total = 0f
        detectHorizontalDragGestures(
            onDragStart = { total = 0f },
            onHorizontalDrag = { change, amount ->
                total += amount
                change.consume()
            },
            onDragEnd = {
                if (abs(total) > threshold.toPx()) {
                    val towardStart = if (rtl) total > 0 else total < 0
                    currentOnSwipe(towardStart)
                }
            },
        )
    }
}

/** Status legend under the week view (blocks are coloured by status, PRD M11). */
@Composable
fun AppCalendarLegend(statuses: List<BookingStatus>, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Row(
        modifier = modifier.fillMaxWidth().padding(horizontal = spacing.space16, vertical = spacing.space8),
        horizontalArrangement = Arrangement.spacedBy(spacing.space12),
    ) {
        statuses.forEach { status ->
            val style = calendarBlockStyle(status, colors)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space4)) {
                Box(Modifier.width(AppTheme.sizes.statusDot).height(AppTheme.sizes.statusDot).background(
                    style.content,
                    AppTheme.shapes.extraSmall,
                ))
                AppText(text = bookingStatusLabel(status), style = AppTheme.typography.labelSmall, color = colors.muted, maxLines = 1)
            }
        }
    }
}

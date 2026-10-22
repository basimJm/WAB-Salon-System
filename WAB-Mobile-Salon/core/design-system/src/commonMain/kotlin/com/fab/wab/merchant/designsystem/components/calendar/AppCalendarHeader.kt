package com.fab.wab.merchant.designsystem.components.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.designsystem.components.badge.AppCountBadge
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.AppIconButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.glass.glassClickable
import com.fab.wab.merchant.designsystem.components.glass.rememberGlassPress
import com.fab.wab.merchant.designsystem.components.selector.AppSegmentedTabs
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppDatePickerDialog
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.calendar_day
import com.fab.wab.merchant.designsystem.resources.calendar_filter
import com.fab.wab.merchant.designsystem.resources.calendar_next
import com.fab.wab.merchant.designsystem.resources.calendar_previous
import com.fab.wab.merchant.designsystem.resources.calendar_today
import com.fab.wab.merchant.designsystem.resources.calendar_week
import com.fab.wab.merchant.designsystem.theme.AppTheme
import kotlinx.datetime.LocalDate
import org.jetbrains.compose.resources.stringResource

/** Intents of the calendar header; the calendar screen (MER-031) answers them. */
sealed interface CalendarHeaderAction {
    data class ModeChanged(val mode: CalendarMode) : CalendarHeaderAction
    data object Today : CalendarHeaderAction
    data class Page(val forward: Boolean) : CalendarHeaderAction
    data class DayPicked(val date: LocalDate) : CalendarHeaderAction
    data object Filter : CalendarHeaderAction
}

/**
 * Calendar header (design 04): title + month (tap → date picker), Today, staff filter with a count, Day / Week
 * switch with previous / next, and the week strip (selected day gradient, today outlined, dot = has bookings).
 */
@Composable
fun AppCalendarHeader(
    title: String,
    monthLabel: String,
    selectedDate: LocalDate,
    mode: CalendarMode,
    strip: List<WeekStripDayUi>,
    onAction: (CalendarHeaderAction) -> Unit,
    modifier: Modifier = Modifier,
    filterCount: Int? = null,
) {
    var picking by remember { mutableStateOf(false) }
    val spacing = AppTheme.spacing
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
        TitleRow(title, monthLabel, filterCount, onPickDate = { picking = true }, onAction = onAction)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
            AppSegmentedTabs(
                tabs = listOf(stringResource(Res.string.calendar_day), stringResource(Res.string.calendar_week)),
                selectedIndex = mode.ordinal,
                onSelect = { onAction(CalendarHeaderAction.ModeChanged(CalendarMode.entries[it])) },
                modifier = Modifier.weight(1f),
            )
            AppIconButton(AppIcons.Back, stringResource(Res.string.calendar_previous), onClick = { onAction(CalendarHeaderAction.Page(forward = false)) })
            AppIconButton(AppIcons.Forward, stringResource(Res.string.calendar_next), onClick = { onAction(CalendarHeaderAction.Page(forward = true)) })
        }
        Row(horizontalArrangement = Arrangement.spacedBy(spacing.space4)) {
            strip.forEach { day -> StripDay(day, Modifier.weight(1f)) { onAction(CalendarHeaderAction.DayPicked(day.date)) } }
        }
    }
    if (picking) {
        AppDatePickerDialog(
            initialIsoDate = selectedDate.toString(),
            onConfirm = { iso ->
                picking = false
                onAction(CalendarHeaderAction.DayPicked(LocalDate.parse(iso)))
            },
            onDismiss = { picking = false },
        )
    }
}

@Composable
private fun TitleRow(title: String, monthLabel: String, filterCount: Int?, onPickDate: () -> Unit, onAction: (CalendarHeaderAction) -> Unit) {
    val press = rememberGlassPress()
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8)) {
        Column(modifier = Modifier.weight(1f).glassClickable(press, role = Role.Button, onClick = onPickDate)) {
            AppText(text = title, style = AppTheme.typography.headlineMedium)
            AppText(text = monthLabel, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
        }
        AppButton(
            text = stringResource(Res.string.calendar_today),
            onClick = { onAction(CalendarHeaderAction.Today) },
            kind = ButtonKind.Outlined,
        )
        if (filterCount != null) {
            Box {
                AppIconButton(AppIcons.Filter, stringResource(Res.string.calendar_filter), onClick = { onAction(CalendarHeaderAction.Filter) })
                AppCountBadge(filterCount, Modifier.align(Alignment.TopEnd))
            }
        }
    }
}

@Composable
private fun StripDay(day: WeekStripDayUi, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.large
    val press = rememberGlassPress()
    val content = when {
        day.selected -> colors.onGradient
        day.isDayOff -> colors.faint
        else -> colors.ink
    }
    val fill = if (day.selected) {
        Modifier.background(Brush.linearGradient(listOf(colors.gradientStart, colors.gradientEnd)), shape)
    } else {
        Modifier.background(colors.surface, shape)
    }
    Column(
        modifier = modifier
            .height(AppTheme.sizes.calendarDayChip)
            .clip(shape)
            .then(fill)
            .then(if (day.isToday && !day.selected) Modifier.border(AppTheme.sizes.borderWidth, colors.gradientEnd, shape) else Modifier)
            .semantics { selected = day.selected }
            .glassClickable(press, role = Role.Tab, onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2, Alignment.CenterVertically),
    ) {
        AppText(text = day.dayLabel, style = AppTheme.typography.labelSmall, color = content, maxLines = 1)
        AppText(text = day.date.day.toString(), style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = content)
        val dot = when {
            !day.hasBookings -> Color.Transparent
            day.selected -> colors.onGradient
            else -> colors.gradientEnd
        }
        Box(Modifier.size(AppTheme.sizes.calendarStripDot).background(dot, AppTheme.shapes.circle))
    }
}

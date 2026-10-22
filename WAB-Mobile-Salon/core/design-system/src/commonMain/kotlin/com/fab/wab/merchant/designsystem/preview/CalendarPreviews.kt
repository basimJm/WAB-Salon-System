package com.fab.wab.merchant.designsystem.preview

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.LayoutDirection
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.designsystem.components.calendar.AppCalendarDayView
import com.fab.wab.merchant.designsystem.components.calendar.AppCalendarHeader
import com.fab.wab.merchant.designsystem.components.calendar.AppCalendarLegend
import com.fab.wab.merchant.designsystem.components.calendar.AppCalendarWeekView
import com.fab.wab.merchant.designsystem.components.calendar.CalendarBlockUi
import com.fab.wab.merchant.designsystem.components.calendar.CalendarColumnUi
import com.fab.wab.merchant.designsystem.components.calendar.CalendarMode
import com.fab.wab.merchant.designsystem.components.calendar.CalendarShadeUi
import com.fab.wab.merchant.designsystem.components.calendar.ShadeKind
import com.fab.wab.merchant.designsystem.components.calendar.TimeWindow
import com.fab.wab.merchant.designsystem.components.calendar.WeekStripDayUi
import com.fab.wab.merchant.designsystem.components.calendar.weekOf
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.theme.AppTheme
import kotlinx.datetime.LocalDate

private const val OPEN = 600
private const val CLOSE = 1_260
private const val START = 540
private const val END = 1_320
private const val NOW = 760
private val Selected = LocalDate(2026, 10, 7)
private val Week = weekOf(Selected)
private val Window = TimeWindow(START, END)
private val Labels = Window.hours.map { "${it / 60 % 12}" }
private val Closed = listOf(CalendarShadeUi(START, OPEN, ShadeKind.CLOSED, "مغلق"), CalendarShadeUi(CLOSE, END, ShadeKind.CLOSED, "مغلق"))

private val Staff = listOf(
    CalendarColumnUi(
        "s1", "رنا",
        listOf(
            CalendarBlockUi("b1", 600, 690, "سارة العلي", "مكياج عروس", "10:00–11:30", BookingStatus.APPROVED, isBride = true),
            CalendarBlockUi("b2", 780, 825, "نور خليل", "قص وتسريح", "1:00–1:45", BookingStatus.PENDING),
        ),
        Closed,
    ),
    CalendarColumnUi("s2", "هبة", listOf(CalendarBlockUi("b3", 660, 750, "ريم", "صبغة شعر", "11:00–12:30", BookingStatus.COMPLETED)), Closed),
    CalendarColumnUi(
        "s3", "دانة", emptyList(),
        Closed + CalendarShadeUi(840, CLOSE, ShadeKind.LEAVE, "إجازة"), tag = "إجازة من 2 م",
    ),
)

@Composable
private fun CalendarFrame(mode: CalendarMode, dark: Boolean, rtl: Boolean) {
    val direction = if (rtl) LayoutDirection.Rtl else LayoutDirection.Ltr
    CompositionLocalProvider(LocalLayoutDirection provides direction) {
        AppTheme(darkTheme = dark) {
            AppScreen {
                Column {
                    AppCalendarHeader(
                        title = "التقويم",
                        monthLabel = "أكتوبر 2026",
                        selectedDate = Selected,
                        mode = mode,
                        strip = Week.map { WeekStripDayUi(it, it.dayOfWeek.name.take(3), it == Selected, it == Selected, it.day % 2 == 0, false) },
                        onAction = {},
                        filterCount = Staff.size,
                        modifier = Modifier.padding(AppTheme.spacing.space16),
                    )
                    if (mode == CalendarMode.DAY) {
                        AppCalendarDayView(Staff, Window, Labels, onBlockClick = {}, onSwipe = {}, nowMinute = NOW)
                    } else {
                        AppCalendarLegend(listOf(BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.COMPLETED, BookingStatus.NO_SHOW))
                        AppCalendarWeekView(Week.map { CalendarColumnUi(it.toString(), it.toString(), Staff.first().blocks, Closed) }, Window, Labels, onDayClick = {}, onSwipe = {})
                    }
                }
            }
        }
    }
}

@Preview(widthDp = 390, heightDp = 844)
@Composable
private fun CalendarDayLightRtlPreview() = CalendarFrame(CalendarMode.DAY, dark = false, rtl = true)

@Preview(widthDp = 390, heightDp = 844)
@Composable
private fun CalendarDayDarkPreview() = CalendarFrame(CalendarMode.DAY, dark = true, rtl = true)

@Preview(widthDp = 390, heightDp = 844)
@Composable
private fun CalendarWeekLtrPreview() = CalendarFrame(CalendarMode.WEEK, dark = false, rtl = false)

package com.fab.wab.merchant.feature.bookings.presentation.screen

import androidx.compose.runtime.Composable
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.month_1
import com.fab.wab.merchant.feature.bookings.presentation.resources.month_10
import com.fab.wab.merchant.feature.bookings.presentation.resources.month_11
import com.fab.wab.merchant.feature.bookings.presentation.resources.month_12
import com.fab.wab.merchant.feature.bookings.presentation.resources.month_2
import com.fab.wab.merchant.feature.bookings.presentation.resources.month_3
import com.fab.wab.merchant.feature.bookings.presentation.resources.month_4
import com.fab.wab.merchant.feature.bookings.presentation.resources.month_5
import com.fab.wab.merchant.feature.bookings.presentation.resources.month_6
import com.fab.wab.merchant.feature.bookings.presentation.resources.month_7
import com.fab.wab.merchant.feature.bookings.presentation.resources.month_8
import com.fab.wab.merchant.feature.bookings.presentation.resources.month_9
import com.fab.wab.merchant.feature.bookings.presentation.resources.weekday_fri
import com.fab.wab.merchant.feature.bookings.presentation.resources.weekday_mon
import com.fab.wab.merchant.feature.bookings.presentation.resources.weekday_sat
import com.fab.wab.merchant.feature.bookings.presentation.resources.weekday_sun
import com.fab.wab.merchant.feature.bookings.presentation.resources.weekday_thu
import com.fab.wab.merchant.feature.bookings.presentation.resources.weekday_tue
import com.fab.wab.merchant.feature.bookings.presentation.resources.weekday_wed
import org.jetbrains.compose.resources.stringResource

/** `DayOfWeek` order (Monday first). */
private val WEEKDAYS = listOf(
    Res.string.weekday_mon, Res.string.weekday_tue, Res.string.weekday_wed, Res.string.weekday_thu,
    Res.string.weekday_fri, Res.string.weekday_sat, Res.string.weekday_sun,
)

/** `Month` order (January first). */
private val MONTHS = listOf(
    Res.string.month_1, Res.string.month_2, Res.string.month_3, Res.string.month_4, Res.string.month_5, Res.string.month_6,
    Res.string.month_7, Res.string.month_8, Res.string.month_9, Res.string.month_10, Res.string.month_11, Res.string.month_12,
)

@Composable
internal fun weekdayName(dayOfWeekOrdinal: Int): String = stringResource(WEEKDAYS[dayOfWeekOrdinal.mod(WEEKDAYS.size)])

@Composable
internal fun monthName(monthOrdinal: Int): String = stringResource(MONTHS[monthOrdinal.mod(MONTHS.size)])

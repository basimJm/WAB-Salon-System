package com.fab.wab.merchant.feature.bookings.presentation.screen

import androidx.compose.runtime.Composable
import com.fab.wab.merchant.feature.bookings.domain.model.BookingsTab
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_empty_past
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_empty_past_body
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_empty_pending
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_empty_pending_body
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_empty_today
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_empty_to_close
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_empty_to_close_body
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_empty_today_body
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_empty_upcoming
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_empty_upcoming_body
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_tab_past
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_tab_pending
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_tab_to_close
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_tab_today
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_tab_upcoming
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

@Composable
internal fun tabLabel(tab: BookingsTab): String = stringResource(
    when (tab) {
        BookingsTab.PENDING -> Res.string.bookings_tab_pending
        BookingsTab.UPCOMING -> Res.string.bookings_tab_upcoming
        BookingsTab.TODAY -> Res.string.bookings_tab_today
        BookingsTab.TO_CLOSE -> Res.string.bookings_tab_to_close
        BookingsTab.PAST -> Res.string.bookings_tab_past
    },
)

internal fun emptyCopy(tab: BookingsTab): Pair<StringResource, StringResource> = when (tab) {
    BookingsTab.PENDING -> Res.string.bookings_empty_pending to Res.string.bookings_empty_pending_body
    BookingsTab.UPCOMING -> Res.string.bookings_empty_upcoming to Res.string.bookings_empty_upcoming_body
    BookingsTab.TODAY -> Res.string.bookings_empty_today to Res.string.bookings_empty_today_body
    BookingsTab.TO_CLOSE -> Res.string.bookings_empty_to_close to Res.string.bookings_empty_to_close_body
    BookingsTab.PAST -> Res.string.bookings_empty_past to Res.string.bookings_empty_past_body
}

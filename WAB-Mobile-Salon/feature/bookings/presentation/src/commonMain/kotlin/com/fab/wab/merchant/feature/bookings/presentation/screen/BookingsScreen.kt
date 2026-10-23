package com.fab.wab.merchant.feature.bookings.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.designsystem.components.booking.AppBookingCard
import com.fab.wab.merchant.designsystem.components.booking.BookingCardUi
import com.fab.wab.merchant.designsystem.components.chip.ActiveFilterChip
import com.fab.wab.merchant.designsystem.components.chip.AppFilterChipRow
import com.fab.wab.merchant.designsystem.components.feedback.AppEmptyState
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.format.dateTimeText
import com.fab.wab.merchant.designsystem.components.layout.AppPagedList
import com.fab.wab.merchant.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.selector.AppSegmentedTabs
import com.fab.wab.merchant.designsystem.components.shimmer.AppShimmerList
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppSearchBar
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.bookings.domain.model.BookingSummary
import com.fab.wab.merchant.feature.bookings.domain.model.BookingsTab
import com.fab.wab.merchant.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingsContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingsContract.UiState
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_filter
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_no_results
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_no_results_body
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_search
import com.fab.wab.merchant.feature.bookings.presentation.resources.bookings_title
import com.fab.wab.merchant.core.domain.booking.BookingTimers
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import org.jetbrains.compose.resources.stringResource

/** PRD M08 (design 03 `on.list`): search, tabs, filter chips, paged booking cards. */
@Composable
fun BookingsScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(BookingsAnalytics.SCREEN_LIST)
    val spacing = AppTheme.spacing
    AppScreen(modifier = modifier, scrollsUnderTabBar = true) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            Column(
                modifier = Modifier.padding(horizontal = spacing.space16, vertical = spacing.space12),
                verticalArrangement = Arrangement.spacedBy(spacing.space10),
            ) {
                AppText(text = stringResource(Res.string.bookings_title), style = AppTheme.typography.headlineMedium)
                AppSearchBar(
                    value = state.query,
                    onValueChange = { onAction(UiAction.OnQueryChange(it)) },
                    placeholder = stringResource(Res.string.bookings_search),
                    filterDescription = stringResource(Res.string.bookings_filter),
                    onFilterClick = { onAction(UiAction.OnFilterClick) },
                )
                AppSegmentedTabs(
                    tabs = BookingsTab.entries.map { tabLabel(it) },
                    selectedIndex = state.tab.ordinal,
                    onSelect = { onAction(UiAction.OnTabSelect(BookingsTab.entries[it])) },
                )
                AppFilterChipRow(chips = filterChips(state), onRemove = { onAction(UiAction.OnFilterClear) })
            }
            AppPullToRefresh(refreshing = state.refreshing, onRefresh = { onAction(UiAction.OnRefresh) }) { ListBody(state, onAction) }
        }
    }
    if (state.filterOpen) BookingsFilterSheet(state = state, onAction = onAction)
}

@Composable
private fun ListBody(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    when {
        state.loading && state.items.isEmpty() -> AppShimmerList(modifier = Modifier.padding(spacing.space16))
        state.error != null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
        state.isEmpty -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            val searching = state.query.isNotBlank() || state.filter.activeCount > 0
            val (title, body) = if (searching) {
                Res.string.bookings_no_results to Res.string.bookings_no_results_body
            } else {
                emptyCopy(state.tab)
            }
            AppEmptyState(title = stringResource(title), message = stringResource(body))
        }
        else -> AppPagedList(
            items = state.items,
            itemKey = { it.id },
            hasMore = state.hasMore,
            loadingMore = state.loadingMore,
            onLoadMore = { onAction(UiAction.OnLoadMore) },
            contentPadding = PaddingValues(horizontal = spacing.space16, vertical = spacing.space8),
        ) { booking ->
            AppBookingCard(
                booking = booking.toCard(state.nowMs),
                onClick = { onAction(UiAction.OnBookingClick(booking.id)) },
                modifier = Modifier.fillMaxWidth().padding(bottom = spacing.space10),
            )
        }
    }
}

/** List rows have no request time (`createdAt` is on the details only), so the card shows the countdown, not the age. */
@Composable
internal fun BookingSummary.toCard(nowMs: Long): BookingCardUi {
    val text = dateTimeText(start)
    val pending = status == BookingStatus.PENDING
    return BookingCardUi(
        id = id,
        reference = reference,
        customerName = customerName,
        date = text.date,
        time = text.time,
        persons = personsCount,
        staff = staff.joinToString(STAFF_SEPARATOR) { it.name },
        status = status,
        payment = paymentStatus,
        isBride = hasBride,
        autoCancelIn = respondBy?.takeIf {
            pending && nowMs > 0
        }?.let { BookingTimers.autoCancelRemaining(it.toEpochMilliseconds(), nowMs) },
    )
}

@Composable
private fun filterChips(state: UiState): List<ActiveFilterChip> =
    if (state.filter.activeCount == 0) emptyList() else listOf(ActiveFilterChip(FILTER_CHIP_ID, stringResource(Res.string.bookings_filter)))

private const val FILTER_CHIP_ID = "filter"
internal const val STAFF_SEPARATOR = "، "

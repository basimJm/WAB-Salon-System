package com.fab.wab.customer.feature.bookings.presentation.screen

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.booking.BookingTab
import com.fab.wab.customer.designsystem.components.feedback.AppEmptyState
import com.fab.wab.customer.designsystem.components.feedback.AppStateContent
import com.fab.wab.customer.designsystem.components.feedback.AppStateMessage
import com.fab.wab.customer.designsystem.components.feedback.contentStateOf
import com.fab.wab.customer.designsystem.components.layout.AppPagedList
import com.fab.wab.customer.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.selector.AppSegmentedTabs
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerList
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.textfield.AppSearchBar
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingsContract.UiAction
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingsContract.UiState
import com.fab.wab.customer.feature.bookings.presentation.resources.Res
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_book_now
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_empty
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_guest_message
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_login
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_search_hint
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_tab_past
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_tab_upcoming
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_welcome
import org.jetbrains.compose.resources.stringResource

/** S14: welcome header; guest → message + Log in; registered → sticky search, Upcoming | Past, paged cards. */
@Composable
fun BookingsScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(BookingsAnalytics.SCREEN)
    val spacing = AppTheme.spacing
    AppScreen(modifier = modifier, handleIme = false) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            AppText(
                text = stringResource(Res.string.bookings_welcome, state.welcomeName),
                style = AppTheme.typography.headlineSmall,
                modifier = Modifier.padding(horizontal = spacing.space16, vertical = spacing.space12),
                maxLines = 1,
            )
            when (state.signedIn) {
                null -> Unit
                false -> AppStateMessage(
                    icon = AppIcons.Bookings,
                    title = stringResource(Res.string.bookings_guest_message),
                    modifier = Modifier.fillMaxSize(),
                    actionText = stringResource(Res.string.bookings_login),
                    onAction = { onAction(UiAction.OnLoginClick) },
                )
                true -> RegisteredContent(state, onAction)
            }
        }
    }
}

@Composable
private fun RegisteredContent(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val tabs = BookingTab.entries
    Column(modifier = Modifier.fillMaxSize()) {
        AppSearchBar(
            value = state.query,
            onValueChange = { onAction(UiAction.OnQueryChange(it)) },
            placeholder = stringResource(Res.string.bookings_search_hint),
            modifier = Modifier.padding(horizontal = spacing.space16, vertical = spacing.space4),
        )
        AppSegmentedTabs(
            tabs = tabs.map { tab ->
                stringResource(if (tab == BookingTab.UPCOMING) Res.string.bookings_tab_upcoming else Res.string.bookings_tab_past)
            },
            selectedIndex = tabs.indexOf(state.tab),
            onSelect = { onAction(UiAction.OnTabSelect(tabs[it])) },
            modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16, vertical = spacing.space8),
        )
        AppPullToRefresh(refreshing = state.refreshing, onRefresh = { onAction(UiAction.OnRefresh) }) {
            AppStateContent(
                state = contentStateOf(
                    isLoading = state.loading,
                    isOffline = state.offline,
                    errorMessage = state.error,
                    isEmpty = state.loaded && state.bookings.isEmpty(),
                    hasContent = state.bookings.isNotEmpty(),
                ),
                onRetry = { onAction(UiAction.OnRetry) },
                modifier = Modifier.fillMaxSize(),
                loading = { AppShimmerList(Modifier.padding(spacing.space16)) },
                empty = {
                    AppEmptyState(
                        title = stringResource(Res.string.bookings_empty),
                        actionText = stringResource(Res.string.bookings_book_now),
                        onAction = { onAction(UiAction.OnBookNowClick) },
                    )
                },
            ) {
                AppPagedList(
                    items = state.bookings,
                    itemKey = { it.id },
                    hasMore = state.hasMore,
                    loadingMore = state.loadingMore,
                    onLoadMore = { onAction(UiAction.OnLoadMore) },
                    modifier = Modifier.fillMaxSize(),
                ) { booking -> BookingCard(booking = booking, onClick = { onAction(UiAction.OnBookingClick(booking.id)) }) }
            }
        }
    }
}

package com.fab.wab.customer.feature.bookings.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.booking.BookingTab
import com.fab.wab.customer.designsystem.components.layout.tabBarInset
import com.fab.wab.customer.designsystem.components.layout.AppPagedList
import com.fab.wab.customer.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.state_retry
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingsContract.UiAction
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingsContract.UiState
import com.fab.wab.customer.feature.bookings.presentation.resources.Res
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_book_now
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_empty
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_empty_body
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_error_network
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_error_server
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_guest_body
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_guest_message
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_login
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_no_results
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_no_results_body
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_search_hint
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_tab_past
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_tab_upcoming
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_title
import com.fab.wab.customer.feature.bookings.presentation.resources.bookings_welcome
import org.jetbrains.compose.resources.stringResource

/** S14 (design `on.list`): greeting + Playfair title; guest placeholder; registered → search, Upcoming | Past, paged cards. */
@Composable
fun BookingsScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(BookingsAnalytics.SCREEN)
    val spacing = AppTheme.spacing
    AppScreen(modifier = modifier, handleIme = false, scrollsUnderTabBar = true) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            Column(modifier = Modifier.padding(top = spacing.space8, bottom = spacing.space14)) {
                AppText(
                    text = stringResource(Res.string.bookings_welcome, state.welcomeName),
                    style = AppTheme.typography.bodySmall.copy(fontSize = BookingsDesign.fontCaption),
                    color = AppTheme.colors.muted,
                    maxLines = 1,
                )
                AppText(text = stringResource(Res.string.bookings_title), style = AppTheme.typography.headlineMedium, maxLines = 1)
            }
            when (state.signedIn) {
                null -> Unit
                false -> GuestContent(onLogin = { onAction(UiAction.OnLoginClick) })
                true -> RegisteredContent(state, onAction)
            }
        }
    }
}

@Composable
private fun GuestContent(onLogin: () -> Unit) {
    BookingsPlaceholder(
        icon = AppIcons.Bookings,
        title = stringResource(Res.string.bookings_guest_message),
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        body = stringResource(Res.string.bookings_guest_body),
        actionText = stringResource(Res.string.bookings_login),
        onAction = onLogin,
        spec = BookingsDesign.guestPlaceholder,
    )
}

@Composable
private fun RegisteredContent(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val tabs = BookingTab.entries
    Column(modifier = Modifier.fillMaxSize()) {
        BookingsSearchField(
            value = state.query,
            onValueChange = { onAction(UiAction.OnQueryChange(it)) },
            placeholder = stringResource(Res.string.bookings_search_hint),
        )
        BookingsSegmentedTabs(
            tabs = tabs.map { tab ->
                stringResource(if (tab == BookingTab.UPCOMING) Res.string.bookings_tab_upcoming else Res.string.bookings_tab_past)
            },
            selectedIndex = tabs.indexOf(state.tab),
            onSelect = { onAction(UiAction.OnTabSelect(tabs[it])) },
            modifier = Modifier.fillMaxWidth().padding(top = spacing.space12, bottom = spacing.space12),
        )
        AppPullToRefresh(refreshing = state.refreshing, onRefresh = { onAction(UiAction.OnRefresh) }) {
            ListContent(state, onAction)
        }
    }
}

@Composable
private fun ListContent(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    when {
        state.loading -> Column(
            modifier = Modifier.fillMaxSize().padding(bottom = spacing.space20),
            verticalArrangement = Arrangement.spacedBy(spacing.space12),
        ) {
            repeat(BookingsDesign.SHIMMER_CARDS) { BookingsShimmerCard(BookingsDesign.listShimmerHeight) }
        }
        state.offline || state.error != null -> ListPlaceholder(
            icon = if (state.offline) AppIcons.Offline else AppIcons.Error,
            title = stringResource(if (state.offline) Res.string.bookings_error_network else Res.string.bookings_error_server),
            actionText = stringResource(CoreRes.string.state_retry),
            onAction = { onAction(UiAction.OnRetry) },
        )
        state.loaded && state.bookings.isEmpty() && state.query.isNotBlank() -> ListPlaceholder(
            icon = AppIcons.Search,
            title = stringResource(Res.string.bookings_no_results),
            body = stringResource(Res.string.bookings_no_results_body),
        )
        state.loaded && state.bookings.isEmpty() -> ListPlaceholder(
            icon = AppIcons.Bookings,
            title = stringResource(Res.string.bookings_empty),
            body = stringResource(Res.string.bookings_empty_body),
            actionText = stringResource(Res.string.bookings_book_now),
            onAction = { onAction(UiAction.OnBookNowClick) },
        )
        else -> AppPagedList(
            items = state.bookings,
            itemKey = { it.id },
            hasMore = state.hasMore,
            loadingMore = state.loadingMore,
            onLoadMore = { onAction(UiAction.OnLoadMore) },
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = spacing.space20 + tabBarInset()),
            footer = { BookingsShimmerCard(BookingsDesign.listShimmerHeight) },
        ) { booking -> BookingCard(booking = booking, onClick = { onAction(UiAction.OnBookingClick(booking.id)) }) }
    }
}

@Composable
private fun ListPlaceholder(
    icon: ImageVector,
    title: String,
    body: String? = null,
    actionText: String? = null,
    onAction: (() -> Unit)? = null,
) {
    BookingsPlaceholder(
        icon = icon,
        title = title,
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        body = body,
        actionText = actionText,
        onAction = onAction,
    )
}

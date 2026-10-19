package com.fab.wab.customer.feature.notifications.presentation.screen

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.button.AppIconButton
import com.fab.wab.customer.designsystem.components.chip.ActiveFilterChip
import com.fab.wab.customer.designsystem.components.chip.AppFilterChipRow
import com.fab.wab.customer.designsystem.components.dialog.AppDialog
import com.fab.wab.customer.designsystem.components.feedback.AppEmptyState
import com.fab.wab.customer.designsystem.components.feedback.AppStateContent
import com.fab.wab.customer.designsystem.components.feedback.contentStateOf
import com.fab.wab.customer.designsystem.components.layout.AppPagedList
import com.fab.wab.customer.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.navigation.AppTopBar
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerList
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.notifications.domain.model.Notification
import com.fab.wab.customer.feature.notifications.domain.model.NotificationFilters
import com.fab.wab.customer.feature.notifications.presentation.analytics.NotificationsAnalytics
import com.fab.wab.customer.feature.notifications.presentation.controller.contract.NotificationChip
import com.fab.wab.customer.feature.notifications.presentation.controller.contract.NotificationsContract.UiAction
import com.fab.wab.customer.feature.notifications.presentation.controller.contract.NotificationsContract.UiState
import com.fab.wab.customer.feature.notifications.presentation.resources.Res
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_chip_dates
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_chip_from
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_chip_text
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_chip_to
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_close
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_empty
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_filter
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_title
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_view_booking
import kotlinx.coroutines.flow.distinctUntilChanged
import org.jetbrains.compose.resources.stringResource

/** S19: top bar with Filter, active chips, paged list (visible items reported read), popup with View booking. */
@Composable
fun NotificationsScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(NotificationsAnalytics.SCREEN)
    val spacing = AppTheme.spacing
    AppScreen(
        modifier = modifier,
        topBar = {
            AppTopBar(title = stringResource(Res.string.notifications_title), onBack = onBack) {
                AppIconButton(
                    icon = AppIcons.Filter,
                    contentDescription = stringResource(Res.string.notifications_filter),
                    onClick = { onAction(UiAction.OnFilterClick) },
                )
            }
        },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            AppFilterChipRow(
                chips = state.chips.map { ActiveFilterChip(it.name, chipLabel(it, state.filters)) },
                onRemove = { chip -> onAction(UiAction.OnChipRemove(NotificationChip.valueOf(chip.id))) },
                modifier = Modifier.padding(horizontal = spacing.space16),
            )
            AppPullToRefresh(refreshing = state.refreshing, onRefresh = { onAction(UiAction.OnRefresh) }) {
                AppStateContent(
                    state = contentStateOf(
                        isLoading = state.loading,
                        isOffline = state.offline,
                        errorMessage = state.error,
                        isEmpty = state.loaded && state.items.isEmpty(),
                        hasContent = state.items.isNotEmpty(),
                    ),
                    onRetry = { onAction(UiAction.OnRetry) },
                    modifier = Modifier.fillMaxSize(),
                    loading = { AppShimmerList(Modifier.padding(spacing.space16)) },
                    empty = { AppEmptyState(title = stringResource(Res.string.notifications_empty)) },
                ) { NotificationList(state, onAction) }
            }
        }
    }
    state.sheet?.let { NotificationsFilterSheet(it, onAction) }
    state.selected?.let { NotificationPopup(it, onAction) }
}

@Composable
private fun NotificationList(state: UiState, onAction: (UiAction) -> Unit) {
    val listState = rememberLazyListState()
    val currentOnAction by rememberUpdatedState(onAction)
    val items by rememberUpdatedState(state.items)
    LaunchedEffect(listState) {
        snapshotFlow { listState.layoutInfo.visibleItemsInfo.mapNotNull { it.key as? String } }
            .distinctUntilChanged()
            .collect { keys -> if (keys.isNotEmpty() && items.any { it.id in keys }) currentOnAction(UiAction.OnVisible(keys)) }
    }
    AppPagedList(
        items = state.items,
        itemKey = { it.id },
        hasMore = state.hasMore,
        loadingMore = state.loadingMore,
        onLoadMore = { onAction(UiAction.OnLoadMore) },
        modifier = Modifier.fillMaxSize(),
        state = listState,
    ) { item -> NotificationRow(item = item, onClick = { onAction(UiAction.OnItemClick(item.id)) }) }
}

@Composable
private fun NotificationPopup(item: Notification, onAction: (UiAction) -> Unit) {
    val booking = item.bookingId != null
    AppDialog(
        title = item.title,
        confirmText = stringResource(if (booking) Res.string.notifications_view_booking else Res.string.notifications_close),
        onConfirm = { onAction(if (booking) UiAction.OnViewBooking else UiAction.OnPopupDismiss) },
        onDismiss = { onAction(UiAction.OnPopupDismiss) },
        message = item.body,
        dismissText = if (booking) stringResource(Res.string.notifications_close) else null,
        icon = AppIcons.Notifications,
    )
}

@Composable
private fun chipLabel(chip: NotificationChip, filters: NotificationFilters): String = when (chip) {
    NotificationChip.TEXT -> stringResource(Res.string.notifications_chip_text, filters.query)
    NotificationChip.DATES -> {
        val from = filters.from
        val to = filters.to
        when {
            from != null && to != null -> stringResource(Res.string.notifications_chip_dates, from, to)
            from != null -> stringResource(Res.string.notifications_chip_from, from)
            else -> stringResource(Res.string.notifications_chip_to, to.orEmpty())
        }
    }
}

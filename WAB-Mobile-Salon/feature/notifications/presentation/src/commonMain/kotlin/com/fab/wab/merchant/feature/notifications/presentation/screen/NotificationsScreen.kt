package com.fab.wab.merchant.feature.notifications.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.designsystem.components.button.AppIconButton
import com.fab.wab.merchant.designsystem.components.feedback.AppOfflineState
import com.fab.wab.merchant.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.layout.shouldLoadMore
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.notifications.domain.model.NotificationFilters
import com.fab.wab.merchant.feature.notifications.presentation.analytics.NotificationsAnalytics
import com.fab.wab.merchant.feature.notifications.presentation.controller.contract.NotificationChip
import com.fab.wab.merchant.feature.notifications.presentation.controller.contract.NotificationsContract.UiAction
import com.fab.wab.merchant.feature.notifications.presentation.controller.contract.NotificationsContract.UiState
import com.fab.wab.merchant.feature.notifications.presentation.resources.Res
import com.fab.wab.merchant.feature.notifications.presentation.resources.notifications_chip_dates
import com.fab.wab.merchant.feature.notifications.presentation.resources.notifications_chip_from
import com.fab.wab.merchant.feature.notifications.presentation.resources.notifications_chip_remove
import com.fab.wab.merchant.feature.notifications.presentation.resources.notifications_chip_text
import com.fab.wab.merchant.feature.notifications.presentation.resources.notifications_chip_to
import com.fab.wab.merchant.feature.notifications.presentation.resources.notifications_empty
import com.fab.wab.merchant.feature.notifications.presentation.resources.notifications_error
import com.fab.wab.merchant.feature.notifications.presentation.resources.notifications_filter
import com.fab.wab.merchant.feature.notifications.presentation.resources.notifications_retry
import com.fab.wab.merchant.feature.notifications.presentation.resources.notifications_title
import kotlinx.coroutines.flow.distinctUntilChanged
import org.jetbrains.compose.resources.stringResource

private const val ITEM_TYPE = "notification"
private const val FOOTER_KEY = "paging"

/** S19: top bar with the filter button (dot when filters are active), chips, list / loading / empty / error, sheets. */
@Composable
fun NotificationsScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(NotificationsAnalytics.SCREEN)
    AppScreen(
        modifier = modifier,
        topBar = {
            AppTopBar(title = stringResource(Res.string.notifications_title), onBack = onBack) {
                FilterButton(active = state.chips.isNotEmpty(), onClick = { onAction(UiAction.OnFilterClick) })
            }
        },
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            ActiveChips(state, onAction)
            AppPullToRefresh(refreshing = state.refreshing, onRefresh = { onAction(UiAction.OnRefresh) }) {
                NotificationsBody(state, onAction)
            }
        }
    }
    state.sheet?.let { NotificationsFilterSheet(it, onAction) }
    state.selected?.let { NotificationPopupSheet(it, onAction) }
}

@Composable
private fun FilterButton(active: Boolean, onClick: () -> Unit) {
    Box {
        AppIconButton(icon = AppIcons.Filter, contentDescription = stringResource(Res.string.notifications_filter), onClick = onClick)
        if (active) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = NotificationsDesign.filterDotInset, end = NotificationsDesign.filterDotInset)
                    .size(NotificationsDesign.filterDot)
                    .background(AppTheme.colors.danger, AppTheme.shapes.circle),
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ActiveChips(state: UiState, onAction: (UiAction) -> Unit) {
    if (state.chips.isEmpty()) return
    val gap = AppTheme.spacing.space8
    FlowRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(
                start = NotificationsDesign.listHorizontal,
                top = NotificationsDesign.chipsTop,
                end = NotificationsDesign.listHorizontal,
                bottom = NotificationsDesign.chipsBottom,
            ),
        horizontalArrangement = Arrangement.spacedBy(gap),
        verticalArrangement = Arrangement.spacedBy(gap),
    ) {
        state.chips.forEach { chip -> ActiveChip(chipLabel(chip, state.filters), onRemove = { onAction(UiAction.OnChipRemove(chip)) }) }
    }
}

/** `height:34px;padding-inline:12px 6px;border-radius:17px;background:var(--soft)` with a 22 px round remove button. */
@Composable
private fun ActiveChip(label: String, onRemove: () -> Unit) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Row(
        modifier = Modifier
            .height(NotificationsDesign.chipHeight)
            .background(colors.soft, AppTheme.shapes.pill)
            .padding(start = spacing.space12, end = spacing.space6),
        horizontalArrangement = Arrangement.spacedBy(spacing.space6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppText(
            text = label,
            style = AppTheme.typography.labelMedium.copy(fontSize = NotificationsDesign.chipTextSize, fontWeight = FontWeight.SemiBold),
            color = colors.accent,
            maxLines = 1,
        )
        Box(
            modifier = Modifier
                .size(NotificationsDesign.chipRemove)
                .background(colors.accent.copy(alpha = NotificationsDesign.chipRemoveAlpha), AppTheme.shapes.circle)
                .clickable(role = Role.Button, onClick = onRemove),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = AppIcons.Close,
                contentDescription = stringResource(Res.string.notifications_chip_remove, label),
                tint = colors.accent,
                modifier = Modifier.size(NotificationsDesign.chipRemoveIcon),
            )
        }
    }
}

@Composable
private fun NotificationsBody(state: UiState, onAction: (UiAction) -> Unit) {
    val listPadding = PaddingValues(
        start = NotificationsDesign.listHorizontal,
        top = NotificationsDesign.listTop,
        end = NotificationsDesign.listHorizontal,
        bottom = NotificationsDesign.listBottom,
    )
    when {
        state.loading -> Column(
            modifier = Modifier.fillMaxSize().padding(listPadding),
            verticalArrangement = Arrangement.spacedBy(NotificationsDesign.listGap),
        ) { repeat(NotificationsDesign.shimmerCount) { NotificationShimmerRow() } }
        state.offline -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            AppOfflineState(onRetry = { onAction(UiAction.OnRetry) })
        }
        state.error != null -> NotificationsPlaceholder(
            icon = AppIcons.Error,
            title = stringResource(Res.string.notifications_error),
            modifier = Modifier.fillMaxSize(),
            actionText = stringResource(Res.string.notifications_retry),
            onAction = { onAction(UiAction.OnRetry) },
        )
        state.loaded && state.items.isEmpty() -> NotificationsPlaceholder(
            icon = AppIcons.Notifications,
            title = stringResource(Res.string.notifications_empty),
            modifier = Modifier.fillMaxSize(),
        )
        else -> NotificationList(state, onAction, listPadding)
    }
}

@Composable
private fun NotificationList(state: UiState, onAction: (UiAction) -> Unit, contentPadding: PaddingValues) {
    val listState = rememberLazyListState()
    val currentOnAction by rememberUpdatedState(onAction)
    val items by rememberUpdatedState(state.items)
    LaunchedEffect(listState) {
        snapshotFlow { listState.layoutInfo.visibleItemsInfo.mapNotNull { it.key as? String } }
            .distinctUntilChanged()
            .collect { keys -> if (keys.isNotEmpty() && items.any { it.id in keys }) currentOnAction(UiAction.OnVisible(keys)) }
    }
    val loadMore by remember(state.items.size, state.hasMore, state.loadingMore) {
        derivedStateOf {
            shouldLoadMore(
                lastVisibleIndex = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index,
                itemCount = state.items.size,
                hasMore = state.hasMore,
                loadingMore = state.loadingMore,
            )
        }
    }
    LaunchedEffect(loadMore) { if (loadMore) currentOnAction(UiAction.OnLoadMore) }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        state = listState,
        contentPadding = contentPadding,
        verticalArrangement = Arrangement.spacedBy(NotificationsDesign.listGap),
    ) {
        items(count = state.items.size, key = { state.items[it].id }, contentType = { ITEM_TYPE }) { index ->
            val item = state.items[index]
            NotificationRow(item = item, onClick = { onAction(UiAction.OnItemClick(item.id)) })
        }
        if (state.loadingMore) item(key = FOOTER_KEY, contentType = FOOTER_KEY) { NotificationShimmerRow() }
    }
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

package com.fab.wab.customer.designsystem.components.layout

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyGridState
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerListItem
import com.fab.wab.customer.designsystem.theme.AppTheme

/**
 * Screen scaffold: background, side insets (display cutout in landscape), and the content column limited to the
 * adaptive max width and centered, so one layout serves phones, landscape and tablets.
 */
@Composable
fun AppScreen(
    modifier: Modifier = Modifier,
    topBar: (@Composable () -> Unit)? = null,
    bottomBar: (@Composable () -> Unit)? = null,
    maxContentWidth: Dp = AppTheme.adaptive.contentMaxWidth,
    content: @Composable (PaddingValues) -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(AppTheme.colors.background)
            .windowInsetsPadding(WindowInsets.displayCutout),
    ) {
        topBar?.invoke()
        Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
            Box(Modifier.widthIn(max = maxContentWidth).fillMaxSize()) {
                content(PaddingValues(horizontal = AppTheme.adaptive.horizontalPadding))
            }
        }
        bottomBar?.invoke()
    }
}

/** Pull-to-refresh container for every data screen except forms (PRD 3.6). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppPullToRefresh(
    refreshing: Boolean,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    PullToRefreshBox(isRefreshing = refreshing, onRefresh = onRefresh, modifier = modifier) { content() }
}

/**
 * Grid whose column count follows the window (1 on phones in portrait, more in landscape and on tablets).
 * With [onLoadMore] it also pages like [AppPagedList]: next page near the end, a full-width [footer] while loading.
 */
@Composable
fun AppAdaptiveGrid(
    itemCount: Int,
    itemKey: (Int) -> Any,
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(AppTheme.adaptive.horizontalPadding),
    state: LazyGridState = rememberLazyGridState(),
    hasMore: Boolean = false,
    loadingMore: Boolean = false,
    onLoadMore: () -> Unit = {},
    footer: @Composable () -> Unit = { AppShimmerListItem() },
    itemContent: @Composable (Int) -> Unit,
) {
    val gap = AppTheme.spacing.space12
    val currentOnLoadMore by rememberUpdatedState(onLoadMore)
    val loadMore by remember(itemCount, hasMore, loadingMore) {
        derivedStateOf {
            shouldLoadMore(
                lastVisibleIndex = state.layoutInfo.visibleItemsInfo.lastOrNull()?.index,
                itemCount = itemCount,
                hasMore = hasMore,
                loadingMore = loadingMore,
            )
        }
    }
    LaunchedEffect(loadMore) {
        if (loadMore) currentOnLoadMore()
    }
    LazyVerticalGrid(
        columns = GridCells.Fixed(AppTheme.adaptive.gridColumns),
        modifier = modifier,
        state = state,
        contentPadding = contentPadding,
        horizontalArrangement = Arrangement.spacedBy(gap),
        verticalArrangement = Arrangement.spacedBy(gap),
    ) {
        items(count = itemCount, key = itemKey, contentType = { GRID_ITEM_TYPE }) { index -> itemContent(index) }
        if (loadingMore) {
            item(key = GRID_FOOTER_KEY, contentType = GRID_FOOTER_TYPE, span = { GridItemSpan(maxLineSpan) }) { footer() }
        }
    }
}

private const val GRID_ITEM_TYPE = "gridItem"
private const val GRID_FOOTER_TYPE = "gridFooter"
private const val GRID_FOOTER_KEY = "grid-footer"

/** Sticky bottom action area (Book now, Cancel booking, Continue): content above the system navigation bar. */
@Composable
fun AppStickyActionBar(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(AppTheme.colors.card)
            .windowInsetsPadding(WindowInsets.navigationBars)
            .padding(horizontal = AppTheme.adaptive.horizontalPadding, vertical = AppTheme.spacing.space12),
    ) {
        content()
    }
}

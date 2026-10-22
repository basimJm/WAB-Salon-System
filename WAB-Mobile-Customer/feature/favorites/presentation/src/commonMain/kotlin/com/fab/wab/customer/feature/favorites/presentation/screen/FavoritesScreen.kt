package com.fab.wab.customer.feature.favorites.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.layout.tabBarInset
import com.fab.wab.customer.designsystem.components.feedback.AppOfflineState
import com.fab.wab.customer.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.layout.shouldLoadMore
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.favorites.presentation.analytics.FavoritesAnalytics
import com.fab.wab.customer.feature.favorites.presentation.controller.contract.FavoritesContract.UiAction
import com.fab.wab.customer.feature.favorites.presentation.controller.contract.FavoritesContract.UiState
import com.fab.wab.customer.feature.favorites.presentation.resources.Res
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_empty
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_empty_message
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_error
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_explore
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_guest_message
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_guest_title
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_hello
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_login
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_retry
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_title
import org.jetbrains.compose.resources.stringResource

private const val ITEM_TYPE = "favorite"
private const val FOOTER_KEY = "paging"

/** S20: "Hello, name" + Playfair title, then guest / loading / error / empty placeholders or the card list. */
@Composable
fun FavoritesScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(FavoritesAnalytics.SCREEN)
    AppScreen(modifier = modifier, scrollsUnderTabBar = true) {
        Column(modifier = Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.statusBars)) {
            Header(state.greetingName)
            when (state.signedIn) {
                null -> Unit
                false -> FavoritesPlaceholder(
                    icon = AppIcons.Favorite,
                    title = stringResource(Res.string.favorites_guest_title),
                    actionText = stringResource(Res.string.favorites_login),
                    onAction = { onAction(UiAction.OnLoginClick) },
                    modifier = Modifier.fillMaxSize(),
                    body = stringResource(Res.string.favorites_guest_message),
                )
                true -> AppPullToRefresh(
                    refreshing = state.refreshing,
                    onRefresh = { onAction(UiAction.OnRefresh) },
                    modifier = Modifier.fillMaxSize(),
                ) { SignedInBody(state, onAction) }
            }
        }
    }
}

@Composable
private fun Header(name: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(
                start = FavoritesDesign.screenHorizontal,
                top = FavoritesDesign.headerTop,
                end = FavoritesDesign.screenHorizontal,
                bottom = FavoritesDesign.headerBottom,
            ),
    ) {
        AppText(
            text = stringResource(Res.string.favorites_hello, name),
            style = AppTheme.typography.bodySmall.copy(fontSize = FavoritesDesign.helloSize),
            color = AppTheme.colors.muted,
            maxLines = 1,
        )
        AppText(text = stringResource(Res.string.favorites_title), style = AppTheme.typography.headlineMedium)
    }
}

@Composable
private fun SignedInBody(state: UiState, onAction: (UiAction) -> Unit) {
    when {
        state.loading -> Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = FavoritesDesign.screenHorizontal)
                .padding(bottom = FavoritesDesign.listBottom),
            verticalArrangement = Arrangement.spacedBy(FavoritesDesign.listGap),
        ) { repeat(FavoritesDesign.shimmerCount) { FavoriteShimmerCard() } }
        state.offline -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            AppOfflineState(onRetry = { onAction(UiAction.OnRetry) })
        }
        state.error != null -> FavoritesPlaceholder(
            icon = AppIcons.Error,
            title = stringResource(Res.string.favorites_error),
            actionText = stringResource(Res.string.favorites_retry),
            onAction = { onAction(UiAction.OnRetry) },
            modifier = Modifier.fillMaxSize(),
        )
        state.loaded && state.salons.isEmpty() -> FavoritesPlaceholder(
            icon = AppIcons.Favorite,
            title = stringResource(Res.string.favorites_empty),
            actionText = stringResource(Res.string.favorites_explore),
            onAction = { onAction(UiAction.OnExploreClick) },
            modifier = Modifier.fillMaxSize(),
            body = stringResource(Res.string.favorites_empty_message),
        )
        else -> FavoritesList(state, onAction)
    }
}

@Composable
private fun FavoritesList(state: UiState, onAction: (UiAction) -> Unit) {
    val listState = rememberLazyListState()
    val currentOnAction by rememberUpdatedState(onAction)
    val loadMore by remember(state.salons.size, state.hasMore, state.loadingMore) {
        derivedStateOf {
            shouldLoadMore(
                lastVisibleIndex = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index,
                itemCount = state.salons.size,
                hasMore = state.hasMore,
                loadingMore = state.loadingMore,
            )
        }
    }
    LaunchedEffect(loadMore) { if (loadMore) currentOnAction(UiAction.OnLoadMore) }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        state = listState,
        contentPadding = PaddingValues(
            start = FavoritesDesign.screenHorizontal,
            end = FavoritesDesign.screenHorizontal,
            bottom = FavoritesDesign.listBottom + tabBarInset(),
        ),
        verticalArrangement = Arrangement.spacedBy(FavoritesDesign.listGap),
    ) {
        items(count = state.salons.size, key = { state.salons[it].id }, contentType = { ITEM_TYPE }) { index ->
            val salon = state.salons[index]
            FavoriteSalonCard(
                salon = salon,
                onClick = { onAction(UiAction.OnSalonClick(salon.id)) },
                onRemove = { onAction(UiAction.OnRemoveClick(salon.id)) },
            )
        }
        if (state.loadingMore) item(key = FOOTER_KEY, contentType = FOOTER_KEY) { FavoriteShimmerCard() }
    }
}

package com.fab.wab.customer.feature.favorites.presentation.screen

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.domain.AppSalonCard
import com.fab.wab.customer.designsystem.components.feedback.AppEmptyState
import com.fab.wab.customer.designsystem.components.feedback.AppStateContent
import com.fab.wab.customer.designsystem.components.feedback.AppStateMessage
import com.fab.wab.customer.designsystem.components.feedback.contentStateOf
import com.fab.wab.customer.designsystem.components.layout.AppPagedList
import com.fab.wab.customer.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.navigation.AppTopBar
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerList
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.favorites.presentation.analytics.FavoritesAnalytics
import com.fab.wab.customer.feature.favorites.presentation.controller.contract.FavoritesContract.UiAction
import com.fab.wab.customer.feature.favorites.presentation.controller.contract.FavoritesContract.UiState
import com.fab.wab.customer.feature.favorites.presentation.resources.Res
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_empty
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_explore
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_guest_message
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_guest_title
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_login
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_title
import com.fab.wab.customer.feature.home.presentation.screen.toUi
import org.jetbrains.compose.resources.stringResource

/** S20: guest message + Log in, paged favorite cards (heart removes), empty → Explore salons. */
@Composable
fun FavoritesScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(FavoritesAnalytics.SCREEN)
    AppScreen(modifier = modifier, topBar = { AppTopBar(title = stringResource(Res.string.favorites_title)) }) { padding ->
        when (state.signedIn) {
            null -> Unit
            false -> AppStateMessage(
                icon = AppIcons.Favorite,
                title = stringResource(Res.string.favorites_guest_title),
                modifier = Modifier.fillMaxSize().padding(padding),
                message = stringResource(Res.string.favorites_guest_message),
                actionText = stringResource(Res.string.favorites_login),
                onAction = { onAction(UiAction.OnLoginClick) },
            )
            true -> AppPullToRefresh(
                refreshing = state.refreshing,
                onRefresh = { onAction(UiAction.OnRefresh) },
                modifier = Modifier.fillMaxSize().padding(padding),
            ) {
                AppStateContent(
                    state = contentStateOf(
                        isLoading = state.loading,
                        isOffline = state.offline,
                        errorMessage = state.error,
                        isEmpty = state.loaded && state.salons.isEmpty(),
                        hasContent = state.salons.isNotEmpty(),
                    ),
                    onRetry = { onAction(UiAction.OnRetry) },
                    modifier = Modifier.fillMaxSize(),
                    loading = { AppShimmerList(Modifier.padding(AppTheme.spacing.space16)) },
                    empty = {
                        AppEmptyState(
                            title = stringResource(Res.string.favorites_empty),
                            actionText = stringResource(Res.string.favorites_explore),
                            onAction = { onAction(UiAction.OnExploreClick) },
                        )
                    },
                ) {
                    AppPagedList(
                        items = state.salons,
                        itemKey = { it.id },
                        hasMore = state.hasMore,
                        loadingMore = state.loadingMore,
                        onLoadMore = { onAction(UiAction.OnLoadMore) },
                        modifier = Modifier.fillMaxSize(),
                    ) { salon ->
                        AppSalonCard(
                            salon = salon.toUi(),
                            onClick = { onAction(UiAction.OnSalonClick(salon.id)) },
                            onFavoriteClick = { onAction(UiAction.OnRemoveClick(salon.id)) },
                        )
                    }
                }
            }
        }
    }
}

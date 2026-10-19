package com.fab.wab.customer.feature.salons.presentation.screen

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.catalog.CatalogService
import com.fab.wab.customer.designsystem.components.domain.AppServiceCardExpandable
import com.fab.wab.customer.designsystem.components.domain.ServiceCardUi
import com.fab.wab.customer.designsystem.components.feedback.AppEmptyState
import com.fab.wab.customer.designsystem.components.feedback.AppStateContent
import com.fab.wab.customer.designsystem.components.feedback.contentStateOf
import com.fab.wab.customer.designsystem.components.layout.AppPagedList
import com.fab.wab.customer.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.navigation.AppTopBar
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerList
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.salons.presentation.analytics.SalonsAnalytics
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllServicesContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllServicesContract.UiState
import com.fab.wab.customer.feature.salons.presentation.resources.Res
import com.fab.wab.customer.feature.salons.presentation.resources.services_empty
import com.fab.wab.customer.feature.salons.presentation.resources.services_title
import org.jetbrains.compose.resources.stringResource

/** S06: top bar + paged list of expandable service cards. */
@Composable
fun AllServicesScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonsAnalytics.SERVICES_SCREEN)
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(Res.string.services_title), onBack = onBack) },
    ) { padding ->
        AppPullToRefresh(
            refreshing = state.refreshing,
            onRefresh = { onAction(UiAction.OnRefresh) },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            AppStateContent(
                state = contentStateOf(
                    isLoading = state.loading,
                    isOffline = state.offline,
                    errorMessage = state.error,
                    isEmpty = state.loaded && state.services.isEmpty(),
                    hasContent = state.services.isNotEmpty(),
                ),
                onRetry = { onAction(UiAction.OnRetry) },
                modifier = Modifier.fillMaxSize(),
                loading = { AppShimmerList(Modifier.padding(AppTheme.spacing.space16)) },
                empty = { AppEmptyState(title = stringResource(Res.string.services_empty)) },
            ) {
                AppPagedList(
                    items = state.services,
                    itemKey = { it.id },
                    hasMore = state.hasMore,
                    loadingMore = state.loadingMore,
                    onLoadMore = { onAction(UiAction.OnLoadMore) },
                    modifier = Modifier.fillMaxSize(),
                ) { service ->
                    AppServiceCardExpandable(service = service.toUi(), onClick = { onAction(UiAction.OnServiceClick(service.id)) })
                }
            }
        }
    }
}

fun CatalogService.toUi(): ServiceCardUi = ServiceCardUi(id = id, name = name, imageUrl = imageUrl, description = description)

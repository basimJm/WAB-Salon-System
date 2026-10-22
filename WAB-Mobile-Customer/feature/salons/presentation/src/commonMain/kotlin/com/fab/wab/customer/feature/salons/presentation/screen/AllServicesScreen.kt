package com.fab.wab.customer.feature.salons.presentation.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.catalog.CatalogService
import com.fab.wab.customer.designsystem.components.domain.ServiceCardUi
import com.fab.wab.customer.designsystem.components.glass.glassBackground
import com.fab.wab.customer.designsystem.components.layout.AppPagedList
import com.fab.wab.customer.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.resources.Res as DsRes
import com.fab.wab.customer.designsystem.resources.card_more
import com.fab.wab.customer.designsystem.resources.card_see_less
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.home.presentation.screen.DiscoveryDesign
import com.fab.wab.customer.feature.home.presentation.screen.DiscoveryPlaceholder
import com.fab.wab.customer.feature.home.presentation.screen.DiscoveryPlaceholderView
import com.fab.wab.customer.feature.home.presentation.screen.DiscoveryShimmerWide
import com.fab.wab.customer.feature.home.presentation.screen.DiscoveryTopBar
import com.fab.wab.customer.feature.home.presentation.screen.SalonImage
import com.fab.wab.customer.feature.home.presentation.screen.discoveryBody
import com.fab.wab.customer.feature.salons.presentation.analytics.SalonsAnalytics
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllServicesContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllServicesContract.UiState
import com.fab.wab.customer.feature.salons.presentation.resources.Res
import com.fab.wab.customer.feature.salons.presentation.resources.services_empty
import com.fab.wab.customer.feature.salons.presentation.resources.services_title
import org.jetbrains.compose.resources.stringResource

/** S06 (design `on.services`): top bar + paged list of 72 dp-image service cards that expand in place. */
@Composable
fun AllServicesScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonsAnalytics.SERVICES_SCREEN)
    val spacing = AppTheme.spacing
    AppScreen(
        modifier = modifier,
        topBar = { DiscoveryTopBar(title = stringResource(Res.string.services_title), onBack = onBack) },
    ) { _ ->
        AppPullToRefresh(refreshing = state.refreshing, onRefresh = { onAction(UiAction.OnRefresh) }, modifier = Modifier.fillMaxSize()) {
            when {
                state.loading && state.services.isEmpty() -> ServicesShimmer()
                state.services.isEmpty() && (state.offline || state.error != null) -> DiscoveryPlaceholderView(
                    placeholder = if (state.offline) DiscoveryPlaceholder.Offline else DiscoveryPlaceholder.ServerError,
                    onRetry = { onAction(UiAction.OnRetry) },
                )
                state.loaded && state.services.isEmpty() -> DiscoveryPlaceholderView(
                    placeholder = DiscoveryPlaceholder.Empty(title = stringResource(Res.string.services_empty), body = null),
                    onRetry = { onAction(UiAction.OnRetry) },
                )
                else -> AppPagedList(
                    items = state.services,
                    itemKey = { it.id },
                    hasMore = state.hasMore,
                    loadingMore = state.loadingMore,
                    onLoadMore = { onAction(UiAction.OnLoadMore) },
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(
                        start = spacing.space20,
                        end = spacing.space20,
                        top = spacing.space8,
                        bottom = SalonsDesign.LIST_PADDING_BOTTOM,
                    ),
                    footer = { DiscoveryShimmerWide(SalonsDesign.SERVICE_SHIMMER_HEIGHT, SalonsDesign.LIST_RADIUS) },
                ) { service ->
                    ServiceCard(service, onClick = { onAction(UiAction.OnServiceClick(service.id)) })
                }
            }
        }
    }
}

/** Design `allServices` card: 72 dp image, 14.5 sp bold name, 12.5 sp description (2 lines) and a "more / Show less" toggle. */
@Composable
private fun ServiceCard(service: CatalogService, onClick: () -> Unit) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val shape = RoundedCornerShape(SalonsDesign.LIST_RADIUS)
    var expanded by remember(service.id) { mutableStateOf(false) }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .glassBackground(AppTheme.glass, shape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(spacing.space12),
        horizontalArrangement = Arrangement.spacedBy(spacing.space12),
    ) {
        SalonImage(service.imageUrl, Modifier.size(SalonsDesign.SERVICE_IMAGE).clip(AppTheme.shapes.medium))
        Column(modifier = Modifier.weight(1f)) {
            AppText(
                text = service.name,
                style = discoveryBody(DiscoveryDesign.TEXT_14_5, FontWeight.Bold),
                maxLines = 1,
                modifier = Modifier.padding(bottom = spacing.space4),
            )
            AppText(
                text = service.description,
                style = discoveryBody(DiscoveryDesign.TEXT_12_5, lineHeight = DiscoveryDesign.LINE_HEIGHT_1_6),
                color = colors.muted,
                maxLines = if (expanded) Int.MAX_VALUE else SalonsDesign.SERVICE_DESC_LINES,
            )
            AppText(
                text = stringResource(if (expanded) DsRes.string.card_see_less else DsRes.string.card_more),
                style = discoveryBody(DiscoveryDesign.TEXT_12, FontWeight.SemiBold),
                color = colors.accent,
                modifier = Modifier
                    .clickable(role = Role.Button, onClick = { expanded = !expanded })
                    .padding(top = spacing.space4),
            )
        }
    }
}

/** Design `svcLoading`: four 96 dp blocks with an 18 dp radius. */
@Composable
private fun ServicesShimmer() {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier.fillMaxSize().padding(start = spacing.space20, end = spacing.space20, top = spacing.space8),
        verticalArrangement = Arrangement.spacedBy(spacing.space12),
    ) {
        repeat(SalonsDesign.SHIMMER_ITEMS) { DiscoveryShimmerWide(SalonsDesign.SERVICE_SHIMMER_HEIGHT, SalonsDesign.LIST_RADIUS) }
    }
}

fun CatalogService.toUi(): ServiceCardUi = ServiceCardUi(id = id, name = name, imageUrl = imageUrl, description = description)

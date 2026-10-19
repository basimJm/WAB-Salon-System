package com.fab.wab.customer.feature.salons.presentation.screen

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.designsystem.components.chip.ActiveFilterChip
import com.fab.wab.customer.designsystem.components.chip.AppFilterChipRow
import com.fab.wab.customer.designsystem.components.dialog.AppGlobalDialog
import com.fab.wab.customer.designsystem.components.dialog.GlobalDialogKind
import com.fab.wab.customer.designsystem.components.domain.AppSalonCard
import com.fab.wab.customer.designsystem.components.feedback.AppEmptyState
import com.fab.wab.customer.designsystem.components.feedback.AppStateContent
import com.fab.wab.customer.designsystem.components.feedback.contentStateOf
import com.fab.wab.customer.designsystem.components.layout.AppPagedList
import com.fab.wab.customer.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.navigation.AppTopBar
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerSalonCard
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerList
import com.fab.wab.customer.designsystem.components.textfield.AppSearchBar
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.home.presentation.screen.toUi
import com.fab.wab.customer.feature.salons.presentation.analytics.SalonsAnalytics
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.SalonsDialog
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.UiState
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterChipId
import com.fab.wab.customer.feature.salons.presentation.resources.Res
import com.fab.wab.customer.feature.salons.presentation.resources.salons_chip_nearest
import com.fab.wab.customer.feature.salons.presentation.resources.salons_chip_price
import com.fab.wab.customer.feature.salons.presentation.resources.salons_chip_rating
import com.fab.wab.customer.feature.salons.presentation.resources.salons_chip_recommended
import com.fab.wab.customer.feature.salons.presentation.resources.salons_empty
import com.fab.wab.customer.feature.salons.presentation.resources.salons_filter
import com.fab.wab.customer.feature.salons.presentation.resources.salons_search_hint
import com.fab.wab.customer.feature.salons.presentation.resources.salons_title
import org.jetbrains.compose.resources.stringResource

/** S04: sticky top bar + search bar, active chips, paged vertical salon cards. */
@Composable
fun AllSalonsScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonsAnalytics.SCREEN)
    val spacing = AppTheme.spacing
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(Res.string.salons_title), onBack = onBack) },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            AppSearchBar(
                value = state.text,
                onValueChange = { onAction(UiAction.OnTextChange(it)) },
                placeholder = stringResource(Res.string.salons_search_hint),
                modifier = Modifier.padding(horizontal = spacing.space16, vertical = spacing.space8),
                filterDescription = stringResource(Res.string.salons_filter),
                onFilterClick = { onAction(UiAction.OnFilterClick) },
            )
            AppFilterChipRow(
                chips = state.filters.chips(),
                onRemove = { chip -> onAction(UiAction.OnChipRemove(chip.toFilterId())) },
                modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16, vertical = spacing.space4),
            )
            AppPullToRefresh(refreshing = state.refreshing, onRefresh = { onAction(UiAction.OnRefresh) }) {
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
                    loading = { AppShimmerList(Modifier.padding(spacing.space16)) },
                    empty = { AppEmptyState(title = stringResource(Res.string.salons_empty)) },
                ) {
                    AppPagedList(
                        items = state.salons,
                        itemKey = { it.id },
                        hasMore = state.hasMore,
                        loadingMore = state.loadingMore,
                        onLoadMore = { onAction(UiAction.OnLoadMore) },
                        modifier = Modifier.fillMaxSize(),
                        footer = { AppShimmerSalonCard() },
                    ) { salon ->
                        AppSalonCard(
                            salon = salon.toUi(),
                            onClick = { onAction(UiAction.OnSalonClick(salon.id)) },
                            onFavoriteClick = { onAction(UiAction.OnFavoriteClick(salon.id)) },
                        )
                    }
                }
            }
        }
    }
    state.dialog?.let { dialog ->
        AppGlobalDialog(
            kind = dialog.kind(),
            onConfirm = { onAction(UiAction.OnDialogConfirm) },
            onDismiss = { onAction(UiAction.OnDialogDismiss) },
        )
    }
}

/** Chip ids are stable codes; labels are localized here (service names already are). */
@Composable
private fun SalonFilters.chips(): List<ActiveFilterChip> = buildList {
    services.forEach { add(ActiveFilterChip(ChipCodes.SERVICE + it.id, it.name)) }
    priceRange?.let { add(ActiveFilterChip(ChipCodes.PRICE, stringResource(Res.string.salons_chip_price, it.min, it.max))) }
    general?.let {
        val label = if (it == GeneralFilter.NEAREST) Res.string.salons_chip_nearest else Res.string.salons_chip_recommended
        add(ActiveFilterChip(ChipCodes.GENERAL, stringResource(label)))
    }
    minRating?.let { add(ActiveFilterChip(ChipCodes.RATING, stringResource(Res.string.salons_chip_rating, it))) }
}

private fun ActiveFilterChip.toFilterId(): FilterChipId = when {
    id.startsWith(ChipCodes.SERVICE) -> FilterChipId.Service(id.removePrefix(ChipCodes.SERVICE))
    id == ChipCodes.PRICE -> FilterChipId.Price
    id == ChipCodes.RATING -> FilterChipId.Rating
    else -> FilterChipId.General
}

private fun SalonsDialog.kind(): GlobalDialogKind = when (this) {
    SalonsDialog.LocationExplanation -> GlobalDialogKind.LocationExplanation
    SalonsDialog.LocationDenied -> GlobalDialogKind.LocationDenied
    SalonsDialog.AuthRequired -> GlobalDialogKind.AuthRequired
}

private object ChipCodes {
    const val SERVICE = "service:"
    const val PRICE = "price"
    const val GENERAL = "general"
    const val RATING = "rating"
}

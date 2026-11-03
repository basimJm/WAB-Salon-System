package com.fab.wab.customer.feature.salons.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.designsystem.components.chip.ActiveFilterChip
import com.fab.wab.customer.designsystem.components.dialog.AppGlobalDialog
import com.fab.wab.customer.designsystem.components.dialog.GlobalDialogKind
import com.fab.wab.customer.designsystem.components.domain.BusinessTypeLens
import com.fab.wab.customer.designsystem.components.domain.businessTypeTabLabel
import com.fab.wab.customer.designsystem.resources.Res as DsRes
import com.fab.wab.customer.designsystem.resources.audience_men
import com.fab.wab.customer.designsystem.resources.audience_women
import com.fab.wab.customer.designsystem.components.layout.AppPagedList
import com.fab.wab.customer.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.home.presentation.screen.DiscoveryPlaceholder
import com.fab.wab.customer.feature.home.presentation.screen.DiscoveryPlaceholderView
import com.fab.wab.customer.feature.home.presentation.screen.DiscoverySalonRow
import com.fab.wab.customer.feature.home.presentation.screen.DiscoveryShimmerWide
import com.fab.wab.customer.feature.home.presentation.screen.DiscoveryTopBar
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
import com.fab.wab.customer.feature.salons.presentation.resources.salons_empty_body
import com.fab.wab.customer.feature.salons.presentation.resources.salons_title
import com.fab.wab.customer.feature.salons.presentation.resources.salons_title_clinics
import com.fab.wab.customer.feature.salons.presentation.resources.salons_title_salons
import com.fab.wab.customer.feature.salons.presentation.resources.salons_title_tattoo
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/**
 * S04 search (design `on.salons`, BUSINESS_DOMAIN §5.22): top bar titled by the lens type, search + filter button, type
 * lens, quick chips; while typing the grouped suggestions replace the list; otherwise recent searches (empty text), active
 * chips and the paged rows with design states.
 */
@Composable
fun AllSalonsScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonsAnalytics.SCREEN)
    val spacing = AppTheme.spacing
    AppScreen(
        modifier = modifier,
        topBar = { DiscoveryTopBar(title = stringResource(titleOf(state.lens)), onBack = onBack) },
    ) { _ ->
        Column(modifier = Modifier.fillMaxSize()) {
            val chips = state.filters.chips()
            SalonsSearchRow(
                value = state.text,
                onValueChange = { onAction(UiAction.OnTextChange(it)) },
                onSearch = { onAction(UiAction.OnSearchSubmit) },
                chipCount = chips.size,
                onFilterClick = { onAction(UiAction.OnFilterClick) },
            )
            BusinessTypeLens(
                selected = state.lens,
                onSelect = { onAction(UiAction.OnLensSelect(it)) },
                modifier = Modifier.padding(start = spacing.space20, end = spacing.space20, bottom = spacing.space8),
            )
            SearchQuickChips(state.filters, onAction, Modifier.padding(bottom = spacing.space12))
            if (state.showSuggestions) {
                SearchSuggestionList(state.suggestionRows, onAction)
                return@Column
            }
            if (state.showRecent) SearchRecent(state.recent, onAction)
            SalonsActiveChips(chips = chips, onRemove = { chip -> onAction(UiAction.OnChipRemove(chip.toFilterId())) })
            AppPullToRefresh(
                refreshing = state.refreshing,
                onRefresh = { onAction(UiAction.OnRefresh) },
                modifier = Modifier.fillMaxSize(),
            ) {
                when {
                    state.loading && state.visibleSalons.isEmpty() -> SalonsShimmer()
                    state.salons.isEmpty() && (state.offline || state.error != null) -> DiscoveryPlaceholderView(
                        placeholder = if (state.offline) DiscoveryPlaceholder.Offline else DiscoveryPlaceholder.ServerError,
                        onRetry = { onAction(UiAction.OnRetry) },
                    )
                    state.loaded && state.visibleSalons.isEmpty() -> DiscoveryPlaceholderView(
                        placeholder = DiscoveryPlaceholder.Empty(
                            title = stringResource(Res.string.salons_empty),
                            body = stringResource(Res.string.salons_empty_body),
                        ),
                        onRetry = { onAction(UiAction.OnRetry) },
                    )
                    else -> AppPagedList(
                        items = state.visibleSalons,
                        itemKey = { it.id },
                        hasMore = state.hasMore,
                        loadingMore = state.loadingMore,
                        onLoadMore = { onAction(UiAction.OnLoadMore) },
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(
                            start = spacing.space20,
                            end = spacing.space20,
                            bottom = SalonsDesign.LIST_PADDING_BOTTOM,
                        ),
                        footer = { DiscoveryShimmerWide(SalonsDesign.SALON_SHIMMER_HEIGHT, SalonsDesign.LIST_RADIUS) },
                    ) { salon ->
                        DiscoverySalonRow(
                            salon = salon,
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

/** Design `listLoading`: four 112 dp blocks with an 18 dp radius, 12 dp apart. */
@Composable
private fun SalonsShimmer() {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = spacing.space20),
        verticalArrangement = Arrangement.spacedBy(spacing.space12),
    ) {
        repeat(SalonsDesign.SHIMMER_ITEMS) { DiscoveryShimmerWide(SalonsDesign.SALON_SHIMMER_HEIGHT, SalonsDesign.LIST_RADIUS) }
    }
}

/**
 * Chip ids are stable codes; labels are localized here (service names already are). One type is shown by the lens, so
 * type chips appear only when several types are chosen in the sheet.
 */
@Composable
private fun SalonFilters.chips(): List<ActiveFilterChip> = buildList {
    if (businessTypes.size > 1) {
        businessTypes.sortedBy { it.ordinal }.forEach {
            add(ActiveFilterChip(ChipCodes.BUSINESS_TYPE + it.code, stringResource(businessTypeTabLabel(it))))
        }
    }
    gender?.let {
        val label = if (it == Gender.MALE) DsRes.string.audience_men else DsRes.string.audience_women
        add(ActiveFilterChip(ChipCodes.GENDER, stringResource(label)))
    }
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
    id.startsWith(ChipCodes.BUSINESS_TYPE) -> FilterChipId.Type(BusinessType.fromCode(id.removePrefix(ChipCodes.BUSINESS_TYPE)))
    id == ChipCodes.GENDER -> FilterChipId.Gender
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
    const val BUSINESS_TYPE = "business_type:"
    const val GENDER = "gender"
}

private fun titleOf(type: BusinessType?): StringResource = when (type) {
    null -> Res.string.salons_title
    BusinessType.SALON -> Res.string.salons_title_salons
    BusinessType.CLINIC -> Res.string.salons_title_clinics
    BusinessType.TATTOO -> Res.string.salons_title_tattoo
}

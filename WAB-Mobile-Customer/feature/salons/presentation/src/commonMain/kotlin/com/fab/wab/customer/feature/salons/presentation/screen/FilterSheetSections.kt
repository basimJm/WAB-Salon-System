package com.fab.wab.customer.feature.salons.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.designsystem.components.glass.glassBackground
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerBox
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.resources.Res as DsRes
import com.fab.wab.customer.designsystem.resources.price_jod
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.theme.GlassStyle
import com.fab.wab.customer.feature.home.presentation.screen.DiscoveryDesign
import com.fab.wab.customer.feature.home.presentation.screen.discoveryBody
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterSheetContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterSheetContract.UiState
import com.fab.wab.customer.feature.salons.presentation.controller.contract.RatingOptions
import com.fab.wab.customer.feature.salons.presentation.controller.contract.toFloatRange
import com.fab.wab.customer.feature.salons.presentation.controller.vm.generalFilterOptions
import com.fab.wab.customer.feature.salons.presentation.resources.Res
import com.fab.wab.customer.feature.salons.presentation.resources.filter_general
import com.fab.wab.customer.feature.salons.presentation.resources.filter_price
import com.fab.wab.customer.feature.salons.presentation.resources.filter_rating
import com.fab.wab.customer.feature.salons.presentation.resources.filter_see_more
import com.fab.wab.customer.feature.salons.presentation.resources.filter_services
import com.fab.wab.customer.feature.salons.presentation.resources.salons_chip_nearest
import com.fab.wab.customer.feature.salons.presentation.resources.salons_chip_price
import com.fab.wab.customer.feature.salons.presentation.resources.salons_chip_rating
import com.fab.wab.customer.feature.salons.presentation.resources.salons_chip_recommended
import kotlin.math.roundToInt
import org.jetbrains.compose.resources.stringResource

/** Design `fReady` services block: 15 sp bold title, wrapped 38 dp chips, shimmer chips while paging, "See more". */
@Composable
internal fun FilterServicesSection(state: UiState, onAction: (UiAction) -> Unit) {
    Column(Modifier.fillMaxWidth()) {
        SectionTitle(stringResource(Res.string.filter_services))
        val selectedIds = state.selectedServices.map { it.id }.toSet()
        val shown = state.selectedServices.filterNot { sel -> state.services.any { it.id == sel.id } } + state.services
        ChipFlow {
            shown.forEach { service ->
                FilterChoiceChip(service.name, service.id in selectedIds, onClick = { onAction(UiAction.OnServiceToggle(service)) })
            }
            if (state.servicesLoading && state.services.isNotEmpty()) {
                repeat(SalonsDesign.CHIP_SHIMMER_COUNT_MORE) { ChipShimmer(SalonsDesign.CHIP_SHIMMER_WIDTH_MORE) }
            }
        }
        if (state.servicesHasMore && !state.servicesLoading) {
            AppText(
                text = stringResource(Res.string.filter_see_more),
                style = discoveryBody(DiscoveryDesign.TEXT_13, FontWeight.SemiBold),
                color = AppTheme.colors.accent,
                modifier = Modifier
                    .clickable(role = Role.Button, onClick = { onAction(UiAction.OnSeeMoreServices) })
                    .padding(top = AppTheme.spacing.space10),
            )
        }
    }
}

/** Design `showPrice`: title + accent "10–35 JOD" at End, the custom range slider, faint min / max labels. */
@Composable
internal fun FilterPriceSection(state: UiState, onAction: (UiAction) -> Unit) {
    val bounds = state.priceBounds?.toFloatRange() ?: return
    Column(Modifier.fillMaxWidth()) {
        val selection = state.priceSelection ?: bounds
        val colors = AppTheme.colors
        SectionDivider()
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = AppTheme.spacing.space8),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AppText(text = stringResource(Res.string.filter_price), style = discoveryBody(SalonsDesign.TEXT_15, FontWeight.Bold))
            AppText(
                text = stringResource(
                    Res.string.salons_chip_price,
                    selection.start.roundToInt().toString(),
                    selection.endInclusive.roundToInt().toString(),
                ),
                style = discoveryBody(DiscoveryDesign.TEXT_13, FontWeight.Bold),
                color = colors.accent,
            )
        }
        FilterPriceSlider(selection = selection, bounds = bounds, onSelectionChange = { onAction(UiAction.OnPriceChange(it)) })
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            val style = discoveryBody(DiscoveryDesign.TEXT_11_5)
            AppText(
                text = stringResource(DsRes.string.price_jod, bounds.start.roundToInt().toString()),
                style = style,
                color = colors.faint,
            )
            AppText(
                text = stringResource(DsRes.string.price_jod, bounds.endInclusive.roundToInt().toString()),
                style = style,
                color = colors.faint,
            )
        }
    }
}

@Composable
internal fun FilterGeneralSection(state: UiState, onAction: (UiAction) -> Unit) {
    Column(Modifier.fillMaxWidth()) {
        SectionDivider()
        SectionTitle(stringResource(Res.string.filter_general))
        ChipFlow {
            generalFilterOptions.forEach { option ->
                val label = if (option == GeneralFilter.NEAREST) Res.string.salons_chip_nearest else Res.string.salons_chip_recommended
                FilterChoiceChip(stringResource(label), state.general == option, onClick = { onAction(UiAction.OnGeneralSelect(option)) })
            }
        }
    }
}

@Composable
internal fun FilterRatingSection(state: UiState, onAction: (UiAction) -> Unit) {
    Column(Modifier.fillMaxWidth()) {
        SectionDivider()
        SectionTitle(stringResource(Res.string.filter_rating))
        ChipFlow {
            RatingOptions.all.forEach { rating ->
                FilterChoiceChip(
                    stringResource(Res.string.salons_chip_rating, rating),
                    state.minRating == rating,
                    onClick = { onAction(UiAction.OnRatingSelect(rating)) },
                )
            }
        }
    }
}

/** Design `fLoading`: eight 96×38 shimmer chips. */
@Composable
internal fun FilterChipsShimmer() {
    ChipFlow { repeat(SalonsDesign.CHIP_SHIMMER_COUNT) { ChipShimmer(SalonsDesign.CHIP_SHIMMER_WIDTH) } }
}

/** Design `chip(a)`: 38 dp pill, 1.5 dp border (violet when selected, hairline otherwise), soft / card fill, 13 sp 600. */
@Composable
private fun FilterChoiceChip(label: String, selected: Boolean, onClick: () -> Unit) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.pill
    Box(
        modifier = Modifier
            .height(SalonsDesign.FILTER_CHIP_HEIGHT)
            .clip(shape)
            .glassBackground(
                AppTheme.glass,
                shape,
                style = if (selected) GlassStyle.Prominent else GlassStyle.Regular,
                stateBorder = if (selected) colors.gradientEnd else Color.Unspecified,
            )
            .semantics { this.selected = selected }
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = AppTheme.spacing.space16),
        contentAlignment = Alignment.Center,
    ) {
        AppText(
            text = label,
            style = discoveryBody(DiscoveryDesign.TEXT_13, FontWeight.SemiBold),
            color = if (selected) colors.accent else colors.ink,
            maxLines = 1,
        )
    }
}

@Composable
private fun ChipShimmer(width: Dp) {
    AppShimmerBox(modifier = Modifier.width(width).height(SalonsDesign.FILTER_CHIP_HEIGHT), shape = AppTheme.shapes.pill)
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ChipFlow(content: @Composable () -> Unit) {
    FlowRow(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8),
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8),
    ) {
        content()
    }
}

@Composable
private fun SectionTitle(title: String) {
    AppText(
        text = title,
        style = discoveryBody(SalonsDesign.TEXT_15, FontWeight.Bold),
        modifier = Modifier.padding(bottom = AppTheme.spacing.space12),
    )
}

@Composable
private fun SectionDivider() {
    Column(Modifier.fillMaxWidth().padding(vertical = AppTheme.spacing.space20)) {
        Box(Modifier.fillMaxWidth().height(AppTheme.sizes.hairline).background(AppTheme.colors.line))
    }
}

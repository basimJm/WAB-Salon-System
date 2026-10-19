package com.fab.wab.customer.feature.salons.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.designsystem.components.button.AppIconButton
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.button.AppTextButton
import com.fab.wab.customer.designsystem.components.chip.AppFilterChip
import com.fab.wab.customer.designsystem.components.control.AppRadioButton
import com.fab.wab.customer.designsystem.components.control.AppRangeSlider
import com.fab.wab.customer.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.customer.designsystem.components.feedback.AppErrorState
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerLine
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.salons.presentation.analytics.SalonsAnalytics
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterSheetContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterSheetContract.UiState
import com.fab.wab.customer.feature.salons.presentation.controller.contract.RatingOptions
import com.fab.wab.customer.feature.salons.presentation.controller.contract.toFloatRange
import com.fab.wab.customer.feature.salons.presentation.controller.vm.generalFilterOptions
import com.fab.wab.customer.feature.salons.presentation.resources.Res
import com.fab.wab.customer.feature.salons.presentation.resources.filter_apply
import com.fab.wab.customer.feature.salons.presentation.resources.filter_close
import com.fab.wab.customer.feature.salons.presentation.resources.filter_general
import com.fab.wab.customer.feature.salons.presentation.resources.filter_price
import com.fab.wab.customer.feature.salons.presentation.resources.filter_rating
import com.fab.wab.customer.feature.salons.presentation.resources.filter_reset
import com.fab.wab.customer.feature.salons.presentation.resources.filter_see_more
import com.fab.wab.customer.feature.salons.presentation.resources.filter_services
import com.fab.wab.customer.feature.salons.presentation.resources.filter_title
import com.fab.wab.customer.feature.salons.presentation.resources.salons_chip_nearest
import com.fab.wab.customer.feature.salons.presentation.resources.salons_chip_price
import com.fab.wab.customer.feature.salons.presentation.resources.salons_chip_rating
import com.fab.wab.customer.feature.salons.presentation.resources.salons_chip_recommended
import org.jetbrains.compose.resources.stringResource
import kotlin.math.roundToInt

/** S05 full-screen sheet: header (close / title / reset), scrollable sections, sticky Apply. */
@Composable
fun FilterSheet(state: UiState, onAction: (UiAction) -> Unit, onDismiss: () -> Unit) {
    TrackScreen(SalonsAnalytics.FILTER_SCREEN)
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = onDismiss) {
        Column(modifier = Modifier.fillMaxHeight(SHEET_HEIGHT_FRACTION)) {
            SheetHeader(state.canReset, onAction, onDismiss)
            Column(
                modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = spacing.space16),
                verticalArrangement = Arrangement.spacedBy(spacing.space24),
            ) {
                ServicesSection(state, onAction)
                if (state.showPrice) PriceSection(state, onAction)
                GeneralSection(state, onAction)
                RatingSection(state, onAction)
            }
            AppPrimaryButton(
                text = stringResource(Res.string.filter_apply),
                onClick = { onAction(UiAction.OnApply) },
                modifier = Modifier.fillMaxWidth().padding(spacing.space16),
            )
        }
    }
}

@Composable
private fun SheetHeader(canReset: Boolean, onAction: (UiAction) -> Unit, onDismiss: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = AppTheme.spacing.space8),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppIconButton(icon = AppIcons.Close, contentDescription = stringResource(Res.string.filter_close), onClick = onDismiss)
        AppText(
            text = stringResource(Res.string.filter_title),
            style = AppTheme.typography.titleMedium,
            modifier = Modifier.weight(1f),
            textAlign = TextAlign.Center,
        )
        AppTextButton(text = stringResource(Res.string.filter_reset), onClick = { onAction(UiAction.OnReset) }, enabled = canReset)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ServicesSection(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space12)) {
        AppText(text = stringResource(Res.string.filter_services), style = AppTheme.typography.titleSmall)
        val selectedIds = state.selectedServices.map { it.id }.toSet()
        val shown = state.selectedServices.filterNot { sel -> state.services.any { it.id == sel.id } } + state.services
        FlowRow(horizontalArrangement = Arrangement.spacedBy(spacing.space8), verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
            shown.forEach { service ->
                AppFilterChip(
                    text = service.name,
                    selected = service.id in selectedIds,
                    onClick = { onAction(UiAction.OnServiceToggle(service)) },
                )
            }
            if (state.servicesLoading) repeat(SHIMMER_CHIPS) { AppShimmerLine(Modifier.fillMaxWidth(SHIMMER_CHIP_WIDTH)) }
        }
        when {
            state.servicesError != null -> AppErrorState(onRetry = { onAction(UiAction.OnRetryServices) }, message = state.servicesError)
            state.servicesHasMore && !state.servicesLoading ->
                AppTextButton(text = stringResource(Res.string.filter_see_more), onClick = { onAction(UiAction.OnSeeMoreServices) })
        }
    }
}

@Composable
private fun PriceSection(state: UiState, onAction: (UiAction) -> Unit) {
    val bounds = state.priceBounds?.toFloatRange() ?: return
    val selection = state.priceSelection ?: bounds
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8)) {
        AppText(text = stringResource(Res.string.filter_price), style = AppTheme.typography.titleSmall)
        AppText(
            text = stringResource(
                Res.string.salons_chip_price,
                selection.start.roundToInt().toString(),
                selection.endInclusive.roundToInt().toString(),
            ),
            color = AppTheme.colors.muted,
        )
        AppRangeSlider(value = selection, onValueChange = { onAction(UiAction.OnPriceChange(it)) }, valueRange = bounds)
    }
}

@Composable
private fun GeneralSection(state: UiState, onAction: (UiAction) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4)) {
        AppText(text = stringResource(Res.string.filter_general), style = AppTheme.typography.titleSmall)
        generalFilterOptions.forEach { option ->
            val label = if (option == GeneralFilter.NEAREST) Res.string.salons_chip_nearest else Res.string.salons_chip_recommended
            OptionRow(stringResource(label), state.general == option) { onAction(UiAction.OnGeneralSelect(option)) }
        }
    }
}

@Composable
private fun RatingSection(state: UiState, onAction: (UiAction) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4)) {
        AppText(text = stringResource(Res.string.filter_rating), style = AppTheme.typography.titleSmall)
        RatingOptions.all.forEach { rating ->
            OptionRow(stringResource(Res.string.salons_chip_rating, rating), state.minRating == rating) {
                onAction(UiAction.OnRatingSelect(rating))
            }
        }
    }
}

@Composable
private fun OptionRow(label: String, selected: Boolean, onSelect: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        AppRadioButton(selected = selected, onClick = onSelect)
        AppText(text = label)
    }
}

private const val SHEET_HEIGHT_FRACTION = 0.95f
private const val SHIMMER_CHIPS = 3
private const val SHIMMER_CHIP_WIDTH = 0.25f

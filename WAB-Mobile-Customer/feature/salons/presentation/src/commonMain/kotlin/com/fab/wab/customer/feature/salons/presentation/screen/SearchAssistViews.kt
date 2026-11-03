package com.fab.wab.customer.feature.salons.presentation.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.designsystem.components.chip.AppFilterChip
import com.fab.wab.customer.designsystem.components.domain.BusinessTypeBadge
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.home.presentation.screen.DiscoveryDesign
import com.fab.wab.customer.feature.home.presentation.screen.discoveryBody
import com.fab.wab.customer.feature.salons.domain.model.SuggestionRow
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.QuickChip
import com.fab.wab.customer.feature.salons.presentation.controller.vm.SearchQuickDefaults
import com.fab.wab.customer.feature.salons.presentation.controller.vm.isOn
import com.fab.wab.customer.feature.salons.presentation.resources.Res
import com.fab.wab.customer.feature.salons.presentation.resources.salons_chip_nearest
import com.fab.wab.customer.feature.salons.presentation.resources.salons_chip_rating
import com.fab.wab.customer.feature.salons.presentation.resources.search_places_count
import com.fab.wab.customer.feature.salons.presentation.resources.search_quick_open_now
import com.fab.wab.customer.feature.salons.presentation.resources.search_quick_price
import com.fab.wab.customer.feature.salons.presentation.resources.search_recent
import com.fab.wab.customer.feature.salons.presentation.resources.search_recent_clear
import com.fab.wab.customer.feature.salons.presentation.resources.search_suggest_places
import com.fab.wab.customer.feature.salons.presentation.resources.search_suggest_services
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

/** Quick chips Open now · Nearest · 4★ & up · Price (BUSINESS_DOMAIN §5.22); Price opens the filter sheet. */
@Composable
internal fun SearchQuickChips(filters: SalonFilters, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = AppTheme.spacing.space20),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8),
    ) {
        QuickChip.entries.forEach { chip ->
            AppFilterChip(text = quickChipLabel(chip), selected = chip.isOn(filters), onClick = { onAction(UiAction.OnQuickChip(chip)) })
        }
    }
}

@Composable
private fun quickChipLabel(chip: QuickChip): String = when (chip) {
    QuickChip.OPEN_NOW -> stringResource(Res.string.search_quick_open_now)
    QuickChip.NEAREST -> stringResource(Res.string.salons_chip_nearest)
    QuickChip.TOP_RATED -> stringResource(Res.string.salons_chip_rating, SearchQuickDefaults.TOP_RATED_MIN)
    QuickChip.PRICE -> stringResource(Res.string.search_quick_price)
}

/** Recent searches kept on the device: a title with Clear and the texts as chips; a tap searches again. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun SearchRecent(recent: List<String>, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    Column(modifier.fillMaxWidth().padding(start = spacing.space20, end = spacing.space20, bottom = spacing.space12)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            AppText(
                text = stringResource(Res.string.search_recent),
                style = discoveryBody(DiscoveryDesign.TEXT_13_5, FontWeight.Bold),
                modifier = Modifier.weight(1f),
            )
            AppText(
                text = stringResource(Res.string.search_recent_clear),
                style = discoveryBody(DiscoveryDesign.TEXT_13, FontWeight.SemiBold),
                color = AppTheme.colors.accent,
                modifier = Modifier
                    .defaultMinSize(minHeight = AppTheme.sizes.touchTarget)
                    .clickable(role = Role.Button, onClick = { onAction(UiAction.OnRecentClear) })
                    .padding(horizontal = spacing.space8, vertical = spacing.space12),
            )
        }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(spacing.space8), verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
            recent.forEach { text -> AppFilterChip(text = text, selected = false, onClick = { onAction(UiAction.OnRecentClick(text)) }) }
        }
    }
}

/** Typed suggestions: Services (with the number of places offering each) then Places, each with its type label. */
@Composable
internal fun SearchSuggestionList(rows: List<SuggestionRow>, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = AppTheme.spacing.space20, end = AppTheme.spacing.space20, bottom = AppTheme.spacing.space20),
    ) {
        items(rows, key = { it.key() }, contentType = { it::class.simpleName }) { row ->
            when (row) {
                is SuggestionRow.Header -> AppText(
                    text = stringResource(
                        if (row.group == SuggestionRow.Group.SERVICES) Res.string.search_suggest_services else Res.string.search_suggest_places,
                    ),
                    style = discoveryBody(DiscoveryDesign.TEXT_12_5, FontWeight.Bold),
                    color = AppTheme.colors.muted,
                    modifier = Modifier.padding(top = AppTheme.spacing.space12, bottom = AppTheme.spacing.space4),
                )
                is SuggestionRow.Service -> SuggestionLine(
                    name = row.service.name,
                    detail = pluralStringResource(Res.plurals.search_places_count, row.service.placesCount, row.service.placesCount),
                    badge = { BusinessTypeBadge(row.service.businessType) },
                    onClick = { onAction(UiAction.OnSuggestedServiceClick(row.service)) },
                )
                is SuggestionRow.Place -> SuggestionLine(
                    name = row.place.name,
                    detail = null,
                    badge = { BusinessTypeBadge(row.place.businessType) },
                    onClick = { onAction(UiAction.OnSuggestedPlaceClick(row.place.id)) },
                )
            }
        }
    }
}

@Composable
private fun SuggestionLine(name: String, detail: String?, badge: @Composable () -> Unit, onClick: () -> Unit) {
    val spacing = AppTheme.spacing
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = AppTheme.sizes.touchTarget)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(vertical = spacing.space8),
        horizontalArrangement = Arrangement.spacedBy(spacing.space10),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(AppIcons.Search, contentDescription = null, tint = AppTheme.colors.faint, modifier = Modifier.size(SalonsDesign.SEARCH_ICON))
        Column(Modifier.weight(1f)) {
            AppText(text = name, style = discoveryBody(DiscoveryDesign.TEXT_14, FontWeight.SemiBold), maxLines = 1)
            detail?.let { AppText(text = it, style = discoveryBody(DiscoveryDesign.TEXT_12), color = AppTheme.colors.muted, maxLines = 1) }
        }
        badge()
    }
}

private fun SuggestionRow.key(): String = when (this) {
    is SuggestionRow.Header -> group.name
    is SuggestionRow.Service -> SuggestionRow.Group.SERVICES.name + service.id
    is SuggestionRow.Place -> SuggestionRow.Group.PLACES.name + place.id
}

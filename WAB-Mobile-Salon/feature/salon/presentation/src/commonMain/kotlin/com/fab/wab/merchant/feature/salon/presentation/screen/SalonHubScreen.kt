package com.fab.wab.merchant.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.domain.salon.SalonGenderType
import com.fab.wab.merchant.core.domain.salon.SalonProfile
import com.fab.wab.merchant.designsystem.components.avatar.AppAvatar
import com.fab.wab.merchant.designsystem.components.badge.AppStatusBadge
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.dashboard.AppSalonStateChip
import com.fab.wab.merchant.designsystem.components.dashboard.salonStateLabel
import com.fab.wab.merchant.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.salon.domain.HubEntry
import com.fab.wab.merchant.feature.salon.domain.HubTile
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonHubContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonHubContract.UiState
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.hub_men
import com.fab.wab.merchant.feature.salon.presentation.resources.hub_missing
import com.fab.wab.merchant.feature.salon.presentation.resources.hub_no_access
import com.fab.wab.merchant.feature.salon.presentation.resources.hub_title
import com.fab.wab.merchant.feature.salon.presentation.resources.hub_women
import org.jetbrains.compose.resources.stringResource

private const val HEADER_KEY = "hub-header"

/** PRD M12 (design 05 `on.hub`): salon header + permission-gated tiles; [available] = tiles whose screens ship. */
@Composable
fun SalonHubScreen(state: UiState, available: Set<HubTile>, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonAnalytics.SCREEN_HUB)
    val spacing = AppTheme.spacing
    val tiles = state.entries.filter { it.tile in available }
    AppScreen(modifier = modifier, scrollsUnderTabBar = true) { padding ->
        AppPullToRefresh(
            refreshing = state.refreshing,
            onRefresh = { onAction(UiAction.OnRefresh) },
            modifier = Modifier.padding(padding),
        ) {
            LazyVerticalGrid(
                columns = GridCells.Fixed(AppTheme.adaptive.gridColumns),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(spacing.space16),
                horizontalArrangement = Arrangement.spacedBy(spacing.space12),
                verticalArrangement = Arrangement.spacedBy(spacing.space12),
            ) {
                item(key = HEADER_KEY, span = { GridItemSpan(maxLineSpan) }) { Header(state) }
                items(tiles, key = { it.tile.name }, contentType = { HubEntry::class }) { entry ->
                    HubTileCard(entry) { onAction(UiAction.OnTileClick(entry.tile)) }
                }
            }
        }
    }
}

@Composable
private fun Header(state: UiState) {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space12)) {
        AppText(text = stringResource(Res.string.hub_title), style = AppTheme.typography.headlineMedium)
        state.salon?.let { SalonRow(it) }
        if (state.noAccess) AppText(
            text = stringResource(Res.string.hub_no_access),
            style = AppTheme.typography.bodyMedium,
            color = AppTheme.colors.muted,
        )
    }
}

@Composable
private fun SalonRow(salon: SalonProfile) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12)) {
        AppAvatar(name = salon.name, imageUrl = salon.profileUrl)
        Column(modifier = Modifier.weight(1f)) {
            AppText(text = salon.name, style = AppTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
            val type = if (salon.gender == SalonGenderType.FEMALE) Res.string.hub_women else Res.string.hub_men
            AppText(text = stringResource(type), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
        }
        AppSalonStateChip(salon.state, salonStateLabel(salon.state))
    }
}

@Composable
private fun HubTileCard(entry: HubEntry, onClick: () -> Unit) {
    val copy = entry.tile.copy()
    val spacing = AppTheme.spacing
    AppCard(modifier = Modifier.fillMaxWidth(), onClick = onClick) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space6)) {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Icon(copy.icon, contentDescription = null, tint = AppTheme.colors.accent, modifier = Modifier.weight(1f, fill = false))
                Row(modifier = Modifier.weight(1f), horizontalArrangement = Arrangement.End) {
                    if (entry.missing) AppStatusBadge(text = stringResource(Res.string.hub_missing), tone = StatusTone.Warning)
                }
            }
            AppText(text = stringResource(copy.title), style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
            AppText(text = stringResource(copy.subtitle), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
        }
    }
}

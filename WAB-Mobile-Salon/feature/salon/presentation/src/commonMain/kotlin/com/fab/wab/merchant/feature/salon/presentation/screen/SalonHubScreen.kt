package com.fab.wab.merchant.feature.salon.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.domain.salon.Audience
import com.fab.wab.merchant.core.domain.salon.SalonProfile
import com.fab.wab.merchant.designsystem.components.avatar.AppAvatar
import com.fab.wab.merchant.designsystem.components.badge.AppStatusBadge
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.dashboard.AppSalonStateChip
import com.fab.wab.merchant.designsystem.components.dashboard.salonStateLabel
import com.fab.wab.merchant.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.layout.tabBarInset
import com.fab.wab.merchant.designsystem.components.surface.appClickable
import com.fab.wab.merchant.designsystem.components.surface.cardBackground
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
                columns = GridCells.Fixed(AppTheme.adaptive.gridColumns * HubDesign.COLUMNS_PER_GRID_COLUMN),
                modifier = Modifier.fillMaxSize(),
                // Design: `padding:8px 20px 20px`, grid `gap:10px`.
                contentPadding = PaddingValues(
                    start = spacing.space20,
                    top = spacing.space8,
                    end = spacing.space20,
                    bottom = spacing.space20 + tabBarInset(),
                ),
                horizontalArrangement = Arrangement.spacedBy(spacing.space10),
                verticalArrangement = Arrangement.spacedBy(spacing.space10),
            ) {
                item(key = HEADER_KEY, contentType = HEADER_KEY, span = { GridItemSpan(maxLineSpan) }) { Header(state) }
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
    // Design: the salon sits in a card (`padding:12px;border-radius:20px;border:1px solid var(--line)`).
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .cardBackground(AppTheme.surfaces, HubDesign.headerShape)
            .padding(HubDesign.headerPadding),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12),
    ) {
        AppAvatar(name = salon.name, imageUrl = salon.profileUrl)
        Column(modifier = Modifier.weight(1f)) {
            AppText(
                text = salon.name,
                style = AppTheme.typography.titleMedium.copy(fontSize = HubDesign.salonNameSize, fontWeight = FontWeight.Bold),
            )
            val type = if (salon.audience == Audience.FEMALE) Res.string.hub_women else Res.string.hub_men
            AppText(text = stringResource(type), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
        }
        AppSalonStateChip(salon.state, salonStateLabel(salon.state))
    }
}

@Composable
private fun HubTileCard(entry: HubEntry, onClick: () -> Unit) {
    val copy = entry.tile.copy()
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    // Design tile: `padding:14px;border-radius:18px;border:1px solid var(--line);background:var(--card)`.
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(HubDesign.tileShape)
            .cardBackground(AppTheme.surfaces, HubDesign.tileShape)
            .appClickable(onClick = onClick)
            .padding(HubDesign.tilePadding),
        verticalArrangement = Arrangement.spacedBy(spacing.space2),
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
            Box(
                modifier = Modifier.size(HubDesign.iconBox).background(colors.soft, HubDesign.iconBoxShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(copy.icon, contentDescription = null, tint = colors.accent, modifier = Modifier.size(HubDesign.icon))
            }
            Row(modifier = Modifier.weight(1f), horizontalArrangement = Arrangement.End) {
                if (entry.missing) AppStatusBadge(text = stringResource(Res.string.hub_missing), tone = StatusTone.Warning)
            }
        }
        AppText(
            text = stringResource(copy.title),
            modifier = Modifier.padding(top = HubDesign.titleTop),
            style = AppTheme.typography.titleSmall.copy(fontSize = HubDesign.titleSize, fontWeight = FontWeight.Bold),
        )
        AppText(
            text = stringResource(copy.subtitle),
            style = AppTheme.typography.bodySmall.copy(fontSize = HubDesign.subtitleSize),
            color = colors.muted,
        )
    }
}

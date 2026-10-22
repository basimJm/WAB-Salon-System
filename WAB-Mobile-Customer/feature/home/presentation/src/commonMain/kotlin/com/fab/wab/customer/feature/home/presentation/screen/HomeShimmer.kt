package com.fab.wab.customer.feature.home.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import com.fab.wab.customer.designsystem.theme.AppTheme

/** Design S03 `homeLoading`: one page-level shimmer mirroring header, banner, search, tabs and the two carousels. */
@Composable
internal fun HomeShimmer(modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    val d = DiscoveryDesign
    Column(
        modifier = modifier.fillMaxSize().padding(start = spacing.space20, end = spacing.space20, top = spacing.space8),
        verticalArrangement = Arrangement.spacedBy(spacing.space14),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
                DiscoveryShimmer(d.SHIMMER_NAME_WIDTH, d.SHIMMER_NAME_HEIGHT, spacing.space6)
                DiscoveryShimmer(d.SHIMMER_HELLO_WIDTH, d.SHIMMER_HELLO_HEIGHT, spacing.space8)
            }
            DiscoveryShimmer(d.BELL_SIZE, d.BELL_SIZE, d.BELL_SIZE)
        }
        DiscoveryShimmerWide(d.BANNER_HEIGHT, d.SHIMMER_RADIUS_22)
        DiscoveryShimmerWide(d.SEARCH_HEIGHT, d.SHIMMER_RADIUS_14)
        DiscoveryShimmerWide(d.SHIMMER_TABS_HEIGHT, d.SHIMMER_RADIUS_14)
        DiscoveryShimmer(d.SHIMMER_TITLE_WIDTH, d.SHIMMER_TITLE_HEIGHT, spacing.space8, Modifier.padding(top = spacing.space8))
        ShimmerRow(d.SHIMMER_SERVICE_WIDTH, d.SHIMMER_SERVICE_HEIGHT, d.SERVICE_IMAGE_RADIUS)
        DiscoveryShimmer(d.SHIMMER_TITLE_WIDTH_WIDE, d.SHIMMER_TITLE_HEIGHT, spacing.space8, Modifier.padding(top = spacing.space8))
        ShimmerRow(d.SHIMMER_SALON_WIDTH, d.SHIMMER_SALON_HEIGHT, d.SALON_CARD_RADIUS)
    }
}

@Composable
private fun ShimmerRow(width: Dp, height: Dp, radius: Dp) {
    Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12)) {
        repeat(DiscoveryDesign.SHIMMER_ROW_COUNT) { DiscoveryShimmer(width, height, radius) }
    }
}

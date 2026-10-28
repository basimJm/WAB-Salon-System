package com.fab.wab.customer.feature.home.presentation.screen

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.designsystem.components.image.AppImage
import com.fab.wab.customer.designsystem.components.media.nextBannerIndex
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res as DsRes
import com.fab.wab.customer.designsystem.resources.banner_description
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush
import com.fab.wab.customer.designsystem.utils.softShadow
import com.fab.wab.customer.feature.home.domain.model.HomeBanner
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.UiAction
import com.fab.wab.customer.feature.home.presentation.resources.Res
import com.fab.wab.customer.feature.home.presentation.resources.home_search_hint
import com.fab.wab.customer.feature.home.presentation.resources.home_tab_men
import com.fab.wab.customer.feature.home.presentation.resources.home_tab_women
import kotlinx.coroutines.delay
import org.jetbrains.compose.resources.stringResource

/** 150 dp banner pager, 22 dp radius, violet glow, dots inside the image (18×6 active, 6×6 at 50 % inactive). */
@Composable
internal fun HomeBanners(banners: List<HomeBanner>, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    if (banners.isEmpty()) return
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.extraLarge
    val pagerState = rememberPagerState(pageCount = { banners.size })
    val currentOnAction by rememberUpdatedState(onAction)
    LaunchedEffect(banners.size) {
        if (banners.size <= 1) return@LaunchedEffect
        while (true) {
            delay(DiscoveryDesign.BANNER_AUTO_SWIPE_MS.toLong())
            // CUS-097: never fight the user's own swipe with an animation.
            if (!pagerState.isScrollInProgress) {
                pagerState.animateScrollToPage(nextBannerIndex(pagerState.currentPage, banners.size))
            }
        }
    }
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(DiscoveryDesign.BANNER_HEIGHT)
            .softShadow(DiscoveryDesign.BANNER_SHADOW, colors.accent.copy(alpha = DiscoveryDesign.BANNER_SHADOW_ALPHA), shape)
            .clip(shape),
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxWidth().height(DiscoveryDesign.BANNER_HEIGHT),
            key = { banners[it].id },
        ) { page ->
            val banner = banners[page]
            AppImage(
                url = banner.imageUrl,
                contentDescription = stringResource(DsRes.string.banner_description, page + 1, banners.size),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(DiscoveryDesign.BANNER_HEIGHT)
                    .clickable(role = Role.Button, onClick = { currentOnAction(UiAction.OnBannerClick(banner.id)) }),
            )
        }
        if (banners.size > 1) {
            BannerDots(pagerState, banners.size, Modifier.align(Alignment.BottomCenter))
        }
    }
}

/** CUS-097: the current page is read here, so a page change recomposes the dots only, not the pager and its images. */
@Composable
private fun BannerDots(pagerState: PagerState, count: Int, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.padding(bottom = DiscoveryDesign.BANNER_DOT_BOTTOM),
        horizontalArrangement = Arrangement.spacedBy(DiscoveryDesign.BANNER_DOT_GAP),
    ) {
        val current = pagerState.currentPage
        repeat(count) { index -> BannerDot(active = index == current) }
    }
}

@Composable
private fun BannerDot(active: Boolean) {
    val colors = AppTheme.colors
    val width by animateDpAsState(
        if (active) DiscoveryDesign.BANNER_DOT_ACTIVE_WIDTH else DiscoveryDesign.BANNER_DOT_SIZE,
        label = "bannerDot",
    )
    val color = if (active) colors.onMedia else colors.onMedia.copy(alpha = DiscoveryDesign.BANNER_DOT_INACTIVE_ALPHA)
    Box(Modifier.width(width).height(DiscoveryDesign.BANNER_DOT_SIZE).background(color, AppTheme.shapes.pill))
}

/** 50 dp surface button with a hairline, 18 dp search icon and the 13.5 sp faint hint; opens S04. */
@Composable
internal fun HomeSearchButton(onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(DiscoveryDesign.SEARCH_HEIGHT)
            .clip(shape)
            .background(colors.surface)
            .border(AppTheme.sizes.hairline, colors.line, shape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = AppTheme.spacing.space16),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space10),
    ) {
        Icon(AppIcons.Search, contentDescription = null, tint = colors.faint, modifier = Modifier.size(DiscoveryDesign.SEARCH_ICON))
        AppText(
            text = stringResource(Res.string.home_search_hint),
            style = discoveryBody(DiscoveryDesign.TEXT_13_5),
            color = colors.faint,
            maxLines = 1,
        )
    }
}

/** Two-column surface pill (16 dp radius, 5 dp inset); the selected tab is a 40 dp gradient button with a violet glow. */
@Composable
internal fun GenderTabs(selected: Gender?, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth().background(AppTheme.colors.surface, AppTheme.shapes.large).padding(DiscoveryDesign.TABS_PADDING),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6),
    ) {
        Gender.entries.forEach { gender ->
            GenderTab(
                label = stringResource(if (gender == Gender.MALE) Res.string.home_tab_men else Res.string.home_tab_women),
                selected = gender == selected,
                onClick = { onAction(UiAction.OnGenderSelect(gender)) },
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun GenderTab(label: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = RoundedCornerShape(DiscoveryDesign.TAB_RADIUS)
    val background = if (selected) {
        Modifier
            .softShadow(DiscoveryDesign.TAB_SHADOW, colors.accent.copy(alpha = DiscoveryDesign.TAB_SHADOW_ALPHA), shape)
            .brandBackground(brandBrush(), shape)
    } else {
        Modifier.clip(shape)
    }
    Box(
        modifier = modifier
            .height(DiscoveryDesign.TAB_HEIGHT)
            .then(background)
            .semantics { this.selected = selected }
            .clickable(role = Role.Tab, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        AppText(
            text = label,
            style = discoveryBody(DiscoveryDesign.TEXT_14, FontWeight.SemiBold),
            color = if (selected) colors.onGradient else colors.muted,
            maxLines = 1,
        )
    }
}

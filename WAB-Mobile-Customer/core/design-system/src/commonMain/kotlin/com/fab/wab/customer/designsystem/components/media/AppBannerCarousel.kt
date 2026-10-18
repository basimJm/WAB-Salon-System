package com.fab.wab.customer.designsystem.components.media

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.fab.wab.customer.designsystem.components.image.AppImage
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.banner_description
import com.fab.wab.customer.designsystem.theme.AppTheme
import kotlinx.coroutines.delay
import org.jetbrains.compose.resources.stringResource

/**
 * Auto-swiping home banners (S03 item 2). Swiping by hand works too; the timer keeps going from the current page.
 * What a tap does (`SALON`, `EXTERNAL_URL`, `NONE`) is decided by the feature through [onClick].
 */
@Composable
fun AppBannerCarousel(
    banners: List<BannerUi>,
    onClick: (BannerUi) -> Unit,
    modifier: Modifier = Modifier,
    autoSwipeMillis: Int = AppTheme.motion.bannerAutoSwipe,
) {
    if (banners.isEmpty()) return
    val pagerState = rememberPagerState(pageCount = { banners.size })
    val currentOnClick by rememberUpdatedState(onClick)
    LaunchedEffect(banners.size, autoSwipeMillis) {
        if (banners.size <= 1) return@LaunchedEffect
        while (true) {
            delay(autoSwipeMillis.toLong())
            pagerState.animateScrollToPage(nextBannerIndex(pagerState.currentPage, banners.size))
        }
    }
    Column(modifier = modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxWidth().height(AppTheme.sizes.cardImageHeight),
            pageSpacing = AppTheme.spacing.space12,
            key = { banners[it].id },
        ) { page ->
            val banner = banners[page]
            val description = stringResource(Res.string.banner_description, page + 1, banners.size)
            AppImage(
                url = banner.imageUrl,
                contentDescription = description,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(AppTheme.sizes.cardImageHeight)
                    .clip(AppTheme.shapes.medium)
                    .clickable(role = Role.Button, onClick = { currentOnClick(banner) }),
            )
        }
        if (banners.size > 1) {
            PageDots(count = banners.size, selected = pagerState.currentPage)
        }
    }
}

@Composable
private fun PageDots(count: Int, selected: Int, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    Row(
        modifier = modifier.padding(top = AppTheme.spacing.space8).semantics { contentDescription = "" },
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6),
    ) {
        repeat(count) { index ->
            Box(
                Modifier
                    .size(AppTheme.sizes.statusDot)
                    .background(if (index == selected) colors.accent else colors.faint, CircleShape),
            )
        }
    }
}

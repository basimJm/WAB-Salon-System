package com.fab.wab.customer.designsystem.components.image

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import coil3.compose.SubcomposeAsyncImage
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerBox
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme

/**
 * Every remote image goes through here (PRD §3.14): the shared Coil loader (memory + disk cache),
 * a shimmer while loading and a muted fallback when the URL fails, so no screen shows a blank hole.
 */
@Composable
fun AppImage(
    modifier: Modifier = Modifier,
    url: String,
    contentDescription: String? = null,
    contentScale: ContentScale = ContentScale.Crop,
) {
    val imageLoader = LocalImageLoader.current
    SubcomposeAsyncImage(
        model = url,
        contentDescription = contentDescription,
        imageLoader = imageLoader,
        modifier = modifier,
        contentScale = contentScale,
        loading = { AppShimmerBox(Modifier.fillMaxSize()) },
        error = { AppImageFallback() },
    )
}

/** Muted placeholder used when an image is missing or failed; also the look of tiles without a URL. */
@Composable
fun AppImageFallback(modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize().background(AppTheme.colors.soft), contentAlignment = Alignment.Center) {
        Icon(
            imageVector = AppIcons.Image,
            contentDescription = null,
            tint = AppTheme.colors.faint,
            modifier = Modifier.size(AppTheme.sizes.iconLarge),
        )
    }
}

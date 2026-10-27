package com.fab.wab.customer.designsystem.components.image

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.foundation.Image
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import coil3.compose.AsyncImagePainter
import coil3.compose.rememberAsyncImagePainter
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
    // CUS-095: one painter + plain overlays instead of SubcomposeAsyncImage. Subcomposition per image was the main
    // cost of scrolling salon/service lists (skill: avoid SubcomposeLayout in lazy items); the look is unchanged.
    val painter = rememberAsyncImagePainter(model = url, imageLoader = imageLoader, contentScale = contentScale)
    val state by painter.state.collectAsState()
    Box(modifier = modifier) {
        Image(
            painter = painter,
            contentDescription = contentDescription,
            modifier = Modifier.fillMaxSize(),
            contentScale = contentScale,
        )
        when (imageOverlayOf(state)) {
            ImageOverlay.Loading -> AppShimmerBox(Modifier.fillMaxSize())
            ImageOverlay.Fallback -> AppImageFallback()
            ImageOverlay.None -> Unit
        }
    }
}

/** What is drawn over the image: a shimmer while loading, the fallback on error, nothing once it shows. */
internal enum class ImageOverlay { None, Loading, Fallback }

internal fun imageOverlayOf(state: AsyncImagePainter.State): ImageOverlay = when (state) {
    is AsyncImagePainter.State.Success -> ImageOverlay.None
    is AsyncImagePainter.State.Error -> ImageOverlay.Fallback
    is AsyncImagePainter.State.Loading, AsyncImagePainter.State.Empty -> ImageOverlay.Loading
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

package com.fab.wab.merchant.designsystem.components.image

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import coil3.compose.AsyncImage
import coil3.compose.AsyncImagePainter
import com.fab.wab.merchant.designsystem.components.shimmer.AppShimmerBox
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme

/**
 * Every remote image goes through here: the shared Coil loader (memory + disk cache),
 * a shimmer while loading and a muted fallback when the URL fails, so no screen shows a blank hole.
 */
@Composable
fun AppImage(
    url: String,
    modifier: Modifier = Modifier,
    contentDescription: String? = null,
    contentScale: ContentScale = ContentScale.Crop,
    fallback: (@Composable () -> Unit)? = null,
) {
    ModelImage(url, contentDescription, contentScale, modifier, fallback)
}

/** Local bytes (picked, not uploaded yet) through the same loader, shimmer and fallback. */
@Composable
fun AppImage(
    bytes: ByteArray,
    modifier: Modifier = Modifier,
    contentDescription: String? = null,
    contentScale: ContentScale = ContentScale.Crop,
) {
    ModelImage(bytes, contentDescription, contentScale, modifier)
}

/**
 * `AsyncImage` (no subcomposition per image, cheap in lazy lists and grids) decodes at the slot size from its
 * constraints; the shimmer and the fallback are overlays driven by the load state.
 */
@Composable
private fun ModelImage(
    model: Any,
    contentDescription: String?,
    contentScale: ContentScale,
    modifier: Modifier = Modifier,
    fallback: (@Composable () -> Unit)? = null,
) {
    val imageLoader = LocalImageLoader.current
    var phase by remember(model) { mutableStateOf(ImagePhase.LOADING) }
    Box(modifier = modifier) {
        AsyncImage(
            model = model,
            contentDescription = contentDescription,
            imageLoader = imageLoader,
            modifier = Modifier.fillMaxSize(),
            contentScale = contentScale,
            onState = { state -> phase = phaseOf(state) },
        )
        when (phase) {
            ImagePhase.LOADING -> AppShimmerBox(Modifier.fillMaxSize())
            // A caller fallback (the avatar's letters) replaces the generic placeholder when the URL fails.
            ImagePhase.ERROR -> if (fallback != null) fallback() else AppImageFallback()
            ImagePhase.READY -> Unit
        }
    }
}

internal enum class ImagePhase { LOADING, READY, ERROR }

internal fun phaseOf(state: AsyncImagePainter.State): ImagePhase = when (state) {
    is AsyncImagePainter.State.Success -> ImagePhase.READY
    is AsyncImagePainter.State.Error -> ImagePhase.ERROR
    is AsyncImagePainter.State.Loading, AsyncImagePainter.State.Empty -> ImagePhase.LOADING
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

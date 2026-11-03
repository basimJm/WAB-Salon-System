package com.fab.wab.customer.designsystem.components.image

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import coil3.compose.AsyncImage
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerBox

/**
 * An image picked on the device and not uploaded anywhere public yet (the tattoo design preview, BUSINESS_DOMAIN §5.23):
 * decoded from its compressed [bytes] by the shared Coil loader, with the same shimmer / fallback as [AppImage].
 */
@Composable
fun AppLocalImage(
    bytes: ByteArray,
    modifier: Modifier = Modifier,
    contentDescription: String? = null,
    contentScale: ContentScale = ContentScale.Crop,
) {
    val imageLoader = LocalImageLoader.current
    var overlay by remember(bytes) { mutableStateOf(ImageOverlay.Loading) }
    Box(modifier = modifier) {
        AsyncImage(
            model = bytes,
            contentDescription = contentDescription,
            imageLoader = imageLoader,
            modifier = Modifier.fillMaxSize(),
            contentScale = contentScale,
            onState = { overlay = imageOverlayOf(it) },
        )
        when (overlay) {
            ImageOverlay.Loading -> AppShimmerBox(Modifier.fillMaxSize())
            ImageOverlay.Fallback -> AppImageFallback()
            ImageOverlay.None -> Unit
        }
    }
}

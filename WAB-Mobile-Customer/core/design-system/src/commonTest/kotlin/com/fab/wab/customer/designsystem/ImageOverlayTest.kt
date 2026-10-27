package com.fab.wab.customer.designsystem

import coil3.compose.AsyncImagePainter
import com.fab.wab.customer.designsystem.components.image.ImageOverlay
import com.fab.wab.customer.designsystem.components.image.imageOverlayOf
import kotlin.test.Test
import kotlin.test.assertEquals

class ImageOverlayTest {

    @Test
    fun shimmerShowsUntilTheImageArrives() {
        assertEquals(ImageOverlay.Loading, imageOverlayOf(AsyncImagePainter.State.Empty))
        assertEquals(ImageOverlay.Loading, imageOverlayOf(AsyncImagePainter.State.Loading(painter = null)))
    }
}

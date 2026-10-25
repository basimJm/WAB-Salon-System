package com.fab.wab.merchant.designsystem

import coil3.compose.AsyncImagePainter
import com.fab.wab.merchant.designsystem.components.image.ImagePhase
import com.fab.wab.merchant.designsystem.components.image.phaseOf
import kotlin.test.Test
import kotlin.test.assertEquals

/** MER-058: the shimmer stays up while an image is empty or loading (AsyncImage overlays, no subcomposition). */
class ImagePhaseTest {
    @Test
    fun emptyAndLoadingShowTheShimmer() {
        assertEquals(ImagePhase.LOADING, phaseOf(AsyncImagePainter.State.Empty))
        assertEquals(ImagePhase.LOADING, phaseOf(AsyncImagePainter.State.Loading(painter = null)))
    }
}

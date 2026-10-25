package com.fab.wab.merchant.designsystem

import com.fab.wab.merchant.core.domain.upload.UploadKind
import com.fab.wab.merchant.designsystem.components.upload.CropAspect
import com.fab.wab.merchant.designsystem.components.upload.CropState
import com.fab.wab.merchant.designsystem.components.upload.UploadItemUi
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.designsystem.components.upload.durationParts
import com.fab.wab.merchant.designsystem.components.upload.moveItem
import com.fab.wab.merchant.designsystem.components.upload.uploadPercent
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class UploadComponentsTest {
    private val tolerance = 0.0001f

    @Test
    fun percentIsClampedAndRounded() {
        assertEquals(0, uploadPercent(-1f))
        assertEquals(42, uploadPercent(0.4249f))
        assertEquals(100, uploadPercent(1.7f))
    }

    @Test
    fun videoDurationsReadMinutesAndTwoDigitSeconds() {
        assertEquals(0 to "15", durationParts(15_400L))
        assertEquals(1 to "05", durationParts(65_000L))
        assertEquals(0 to "00", durationParts(-3L))
    }

    @Test
    fun moveItemReordersAndClamps() {
        val list = listOf("a", "b", "c", "d")
        assertEquals(listOf("b", "c", "a", "d"), moveItem(list, 0, 2))
        assertEquals(listOf("d", "a", "b", "c"), moveItem(list, 3, -5))
        assertEquals(list, moveItem(list, 7, 0))
        assertEquals(list, moveItem(list, 1, 1))
    }

    @Test
    fun uploadingItemsCannotBeRemoved() {
        val item = UploadItemUi("1", "a.pdf", UploadKind.DOCUMENT, UploadStatus.Uploading(0.3f))
        assertFalse(item.isRemovable)
        assertTrue(item.copy(status = UploadStatus.Failed).isRemovable)
    }

    @Test
    fun wideImageInASquareFrameShowsTheCentreSquare() {
        val region = CropState().region(imageAspect = 2f, frameAspect = CropAspect.SQUARE.ratio)
        assertEquals(0.25f, region.left, tolerance)
        assertEquals(0f, region.top, tolerance)
        assertEquals(0.5f, region.width, tolerance)
        assertEquals(1f, region.height, tolerance)
    }

    @Test
    fun zoomShrinksTheRegionAndPanStaysInsideTheImage() {
        val square = 1f
        val zoomed = CropState().zoomTo(2f, square, square)
        val region = zoomed.region(square, square)
        assertEquals(0.5f, region.width, tolerance)
        assertEquals(0.25f, region.left, tolerance)
        val pannedFar = zoomed.pan(dxFrame = -5f, dyFrame = 5f, imageAspect = square, frameAspect = square)
        val edge = pannedFar.region(square, square)
        assertEquals(0.5f, edge.left, tolerance)
        assertEquals(0f, edge.top, tolerance)
        assertEquals(CropState.MAX_ZOOM, CropState().zoomTo(10f, square, square).zoom)
        assertEquals(1f, CropState().zoomTo(0.2f, square, square).zoom)
    }

    @Test
    fun cropAspectsMatchTheDesign() {
        assertEquals(16f / 9f, CropAspect.WIDE.ratio, tolerance)
        assertEquals(1f, CropAspect.SQUARE.ratio)
    }
}

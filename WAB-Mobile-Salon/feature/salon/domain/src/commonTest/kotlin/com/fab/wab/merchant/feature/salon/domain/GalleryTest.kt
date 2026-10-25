package com.fab.wab.merchant.feature.salon.domain

import com.fab.wab.merchant.core.domain.upload.UploadLimits
import kotlin.test.Test
import kotlin.test.assertEquals

class GalleryTest {

    private fun item(id: String, type: GalleryType) = GalleryItem(id, type, "u/$id", null, null, 0)

    @Test
    fun slotsCountServerAndPendingItems() {
        val items = listOf(item("a", GalleryType.IMAGE), item("b", GalleryType.VIDEO))
        assertEquals(UploadLimits.GALLERY_MAX_IMAGES - 3 to UploadLimits.GALLERY_MAX_VIDEOS - 1, gallerySlots(items, pendingImages = 2))
        val full = List(UploadLimits.GALLERY_MAX_IMAGES + 1) { item("$it", GalleryType.IMAGE) }
        assertEquals(0, gallerySlots(full).first)
        assertEquals("u/a", items.first().previewUrl)
    }

    @Test
    fun moveKeepsEveryItemAndIgnoresBadIndexes() {
        val list = listOf("a", "b", "c", "d")
        assertEquals(listOf("c", "a", "b", "d"), list.moved(2, 0))
        assertEquals(listOf("b", "c", "a", "d"), list.moved(0, 2))
        assertEquals(list, list.moved(1, 9))
    }
}

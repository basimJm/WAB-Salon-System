package com.fab.wab.merchant.feature.salon.domain

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.upload.UploadLimits

enum class GalleryType { IMAGE, VIDEO }

/** One item of `GET /salon/gallery`; [thumbnailUrl] may be missing right after an upload (fall back to [url]). */
data class GalleryItem(
    val id: String,
    val type: GalleryType,
    val url: String,
    val thumbnailUrl: String?,
    val durationSec: Int?,
    val order: Int,
) {
    val previewUrl: String get() = thumbnailUrl ?: url
}

/** Free slots per type (PRD M14: 50 photos, 10 videos). */
fun gallerySlots(items: List<GalleryItem>, pendingImages: Int = 0, pendingVideos: Int = 0): Pair<Int, Int> {
    val images = items.count { it.type == GalleryType.IMAGE } + pendingImages
    val videos = items.count { it.type == GalleryType.VIDEO } + pendingVideos
    return (UploadLimits.GALLERY_MAX_IMAGES - images).coerceAtLeast(0) to (UploadLimits.GALLERY_MAX_VIDEOS - videos).coerceAtLeast(0)
}

/** Moves the item at [from] to [to] (drag or "one place earlier"). */
fun <T> List<T>.moved(from: Int, to: Int): List<T> {
    if (from !in indices || to !in indices || from == to) return this
    val list = toMutableList()
    val item = list.removeAt(from)
    list.add(to, item)
    return list
}

/** `/salon/gallery` (GALLERY_MANAGE). */
interface GalleryRepository {
    suspend fun list(): AppResult<List<GalleryItem>>

    suspend fun add(type: GalleryType, key: String, durationSec: Int?): AppResult<GalleryItem>

    suspend fun reorder(ids: List<String>): AppResult<List<GalleryItem>>

    suspend fun delete(id: String): AppResult<Unit>
}

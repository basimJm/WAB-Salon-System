package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.contract.generated.GetSalonGalleryDataItem
import com.fab.wab.merchant.core.data.contract.generated.PostSalonGalleryBody
import com.fab.wab.merchant.core.data.contract.generated.PostSalonGalleryData
import com.fab.wab.merchant.core.data.contract.generated.PutSalonGalleryOrderBody
import com.fab.wab.merchant.core.data.contract.generated.PutSalonGalleryOrderDataItem
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.salon.domain.GalleryItem
import com.fab.wab.merchant.feature.salon.domain.GalleryRepository
import com.fab.wab.merchant.feature.salon.domain.GalleryType

/** Diagnostic text when the server returns a type the app does not know (never shown to users). */
private const val UNREADABLE_ITEM = "gallery item type not supported"

private fun galleryItem(id: String, type: String, url: String, thumbnailUrl: String?, durationSec: Double?, order: Double): GalleryItem? {
    val kind = GalleryType.entries.firstOrNull { it.name == type.uppercase() } ?: return null
    return GalleryItem(id, kind, url, thumbnailUrl?.takeIf { it.isNotBlank() }, durationSec?.toInt(), order.toInt())
}

fun GetSalonGalleryDataItem.toDomain(): GalleryItem? = galleryItem(id, type, url, thumbnailUrl, durationSec, order)

fun PostSalonGalleryData.toDomain(): GalleryItem? = galleryItem(id, type, url, thumbnailUrl, durationSec, order)

fun PutSalonGalleryOrderDataItem.toDomain(): GalleryItem? = galleryItem(id, type, url, thumbnailUrl, durationSec, order)

class GalleryRepositoryImpl(private val api: GalleryApi) : GalleryRepository {
    override suspend fun list(): AppResult<List<GalleryItem>> =
        safeApiCall { api.list() }.mapSuccess { response -> response.data.mapNotNull { it.toDomain() }.sortedBy { it.order } }

    override suspend fun add(type: GalleryType, key: String, durationSec: Int?): AppResult<GalleryItem> =
        when (val result = safeApiCall { api.add(PostSalonGalleryBody(type.name, key, durationSec = durationSec)) }) {
            is AppResult.Success -> result.data.data.toDomain()?.let {
                AppResult.Success(it)
            } ?: AppResult.Error(AppError.UnknownError(UNREADABLE_ITEM))
            is AppResult.Error -> result
            AppResult.Loading -> AppResult.Loading
        }

    override suspend fun reorder(ids: List<String>): AppResult<List<GalleryItem>> =
        safeApiCall {
            api.reorder(PutSalonGalleryOrderBody(ids))
        }.mapSuccess { response -> response.data.mapNotNull { it.toDomain() }.sortedBy { it.order } }

    override suspend fun delete(id: String): AppResult<Unit> = safeApiCall { api.delete(id) }.mapSuccess { }
}

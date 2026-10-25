package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.contract.generated.GetCatalogServicesDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetSalonServicesDataItem
import com.fab.wab.merchant.core.data.contract.generated.PatchSalonServicesByIdData
import com.fab.wab.merchant.core.data.contract.generated.PostSalonServicesBody
import com.fab.wab.merchant.core.data.contract.generated.PostSalonServicesData
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.domain.salon.SalonGenderType
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.salon.domain.CatalogService
import com.fab.wab.merchant.feature.salon.domain.SalonService
import com.fab.wab.merchant.feature.salon.domain.ServiceDraft
import com.fab.wab.merchant.feature.salon.domain.ServiceLimits
import com.fab.wab.merchant.feature.salon.domain.ServicesRepository
import com.fab.wab.merchant.feature.salon.domain.normalizeNumber
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** `PATCH /salon/services/{id}` field names (contract). */
internal object ServiceKeys {
    const val PRICE = "price"
    const val DURATION = "durationMinutes"
    const val BRIDE_ONLY = "brideOnly"
    const val DESCRIPTION = "extraDescription"
    const val MEDIA_KEYS = "mediaKeys"
    const val ACTIVE = "active"
}

/** Every service page is read until a short page (the salon list is small; the form screens need the full set). */
private const val FIRST_PAGE = 1
private const val CHANGE_BUFFER = 8

/** The fields the three service DTOs share, before parsing. */
private data class RawService(
    val id: String, val catalogId: String, val name: String, val imageUrl: String, val price: String, val duration: Double,
    val brideOnly: Boolean, val description: String?, val media: List<String>, val active: Boolean,
)

private fun RawService.toDomain() = SalonService(
    id,
    catalogId,
    name,
    imageUrl,
    price,
    duration.toInt(),
    brideOnly,
    description?.takeIf { it.isNotBlank() },
    media,
    active,
)

fun GetSalonServicesDataItem.toDomain() =
    RawService(id, catalogServiceId, name, imageUrl, price, durationMinutes, brideOnly, extraDescription, mediaUrls, active).toDomain()

fun PostSalonServicesData.toDomain() =
    RawService(id, catalogServiceId, name, imageUrl, price, durationMinutes, brideOnly, extraDescription, mediaUrls, active).toDomain()

fun PatchSalonServicesByIdData.toDomain() =
    RawService(id, catalogServiceId, name, imageUrl, price, durationMinutes, brideOnly, extraDescription, mediaUrls, active).toDomain()

fun GetCatalogServicesDataItem.toDomain(): CatalogService? {
    val type = SalonGenderType.entries.firstOrNull { it.name == gender.uppercase() } ?: return null
    return CatalogService(id, name, description, imageUrl, type)
}

fun ServiceDraft.toPatch(): JsonObject = buildJsonObject {
    put(ServiceKeys.PRICE, normalizeNumber(price))
    normalizeNumber(durationMinutes).toIntOrNull()?.let { put(ServiceKeys.DURATION, it) }
    put(ServiceKeys.BRIDE_ONLY, brideOnly)
    put(ServiceKeys.DESCRIPTION, description.trim().ifEmpty { null }?.let(::JsonPrimitive) ?: JsonNull)
    mediaKeys?.let { keys -> put(ServiceKeys.MEDIA_KEYS, JsonArray(keys.map(::JsonPrimitive))) }
    put(ServiceKeys.ACTIVE, active)
}

/** Creating / changing a service refreshes the shared salon (completeness `SERVICE`). */
class ServicesRepositoryImpl(private val api: ServicesApi, private val salon: SalonRepository) : ServicesRepository {
    private val services = mutableMapOf<String, SalonService>()
    private val saved = MutableSharedFlow<SalonService>(extraBufferCapacity = CHANGE_BUFFER)
    override val changes: Flow<SalonService> = saved.asSharedFlow()
    private val catalog = mutableMapOf<String, CatalogService>()

    override suspend fun services(): AppResult<List<SalonService>> {
        val all = mutableListOf<SalonService>()
        var page = FIRST_PAGE
        while (true) {
            when (val result = safeApiCall { api.services(page, ServiceLimits.PAGE_SIZE) }) {
                is AppResult.Success -> {
                    all += result.data.data.map { it.toDomain() }
                    if (result.data.data.size < ServiceLimits.PAGE_SIZE) break
                    page += 1
                }
                is AppResult.Error -> return result
                AppResult.Loading -> return AppResult.Loading
            }
        }
        services.clear()
        all.forEach { services[it.id] = it }
        return AppResult.Success(all)
    }

    override suspend fun catalog(gender: SalonGenderType, page: Int): AppResult<List<CatalogService>> =
        safeApiCall { api.catalog(gender.name, page, ServiceLimits.PAGE_SIZE) }.mapSuccess { response ->
            response.data.mapNotNull { it.toDomain() }.also { rows -> rows.forEach { catalog[it.id] = it } }
        }

    override fun cachedService(id: String): SalonService? = services[id]

    override fun cachedCatalog(id: String): CatalogService? = catalog[id]

    override suspend fun create(catalogId: String, draft: ServiceDraft): AppResult<SalonService> {
        val body = PostSalonServicesBody(
            catalogServiceId = catalogId,
            price = normalizeNumber(draft.price),
            durationMinutes = normalizeNumber(draft.durationMinutes).toIntOrNull() ?: ServiceLimits.DURATION_MIN,
            brideOnly = draft.brideOnly,
            extraDescription = draft.description.trim().ifEmpty { null },
            mediaKeys = draft.mediaKeys?.takeIf { it.isNotEmpty() },
            active = draft.active,
        )
        return safeApiCall { api.create(body) }.mapSuccess { it.data.toDomain() }.also { remember(it) }
    }

    override suspend fun update(id: String, draft: ServiceDraft): AppResult<SalonService> =
        safeApiCall { api.update(id, draft.toPatch()) }.mapSuccess { it.data.toDomain() }.also { remember(it) }

    override suspend fun setActive(id: String, active: Boolean): AppResult<SalonService> =
        safeApiCall {
            api.update(id, buildJsonObject { put(ServiceKeys.ACTIVE, active) })
        }.mapSuccess { it.data.toDomain() }.also { remember(it) }

    private suspend fun remember(result: AppResult<SalonService>) {
        if (result !is AppResult.Success) return
        services[result.data.id] = result.data
        saved.emit(result.data)
        salon.refresh()
    }
}

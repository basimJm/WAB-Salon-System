package com.fab.wab.merchant.feature.salon.presentation

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.salon.SalonGenderType
import com.fab.wab.merchant.feature.salon.domain.CatalogService
import com.fab.wab.merchant.feature.salon.domain.SalonService
import com.fab.wab.merchant.feature.salon.domain.ServiceDraft
import com.fab.wab.merchant.feature.salon.domain.ServiceLimits
import com.fab.wab.merchant.feature.salon.domain.ServicesRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow

internal fun salonService(id: String, catalogId: String = "c-$id", active: Boolean = true) =
    SalonService(id, catalogId, "Service $id", "img/$id", "12.500", 45, false, null, listOf("m/$id"), active)

internal fun catalogItem(id: String) = CatalogService(id, "Catalog $id", "desc", "img/$id", SalonGenderType.FEMALE)

internal class FakeServices : ServicesRepository {
    var list = mutableListOf(salonService("s1", "c1"), salonService("s2", active = false))
    val pages = mutableMapOf(1 to List(ServiceLimits.PAGE_SIZE) { catalogItem("c${it + 1}") }, 2 to listOf(catalogItem("x")))
    var fail = false
    val created = mutableListOf<Pair<String, ServiceDraft>>()
    val updated = mutableListOf<Pair<String, ServiceDraft>>()
    val toggled = mutableListOf<Pair<String, Boolean>>()
    val catalogGenders = mutableListOf<SalonGenderType>()
    private val catalogCache = mutableMapOf<String, CatalogService>()
    private val emitted = MutableSharedFlow<SalonService>(extraBufferCapacity = 8)
    override val changes: Flow<SalonService> = emitted

    private fun error() = AppResult.Error(AppError.NetworkError("offline"))

    override suspend fun services(): AppResult<List<SalonService>> = if (fail) error() else AppResult.Success(list.toList())
    override suspend fun catalog(gender: SalonGenderType, page: Int): AppResult<List<CatalogService>> {
        catalogGenders += gender
        return AppResult.Success(pages[page].orEmpty().also { rows -> rows.forEach { catalogCache[it.id] = it } })
    }
    override fun cachedService(id: String): SalonService? = list.firstOrNull { it.id == id }
    override fun cachedCatalog(id: String): CatalogService? = catalogCache[id]
    override suspend fun create(catalogId: String, draft: ServiceDraft): AppResult<SalonService> {
        if (fail) return error()
        created += catalogId to draft
        return AppResult.Success(salonService("new", catalogId)).also { emitted.emit(it.data) }
    }
    override suspend fun update(id: String, draft: ServiceDraft): AppResult<SalonService> {
        if (fail) return error()
        updated += id to draft
        return AppResult.Success(salonService(id, active = draft.active)).also { emitted.emit(it.data) }
    }
    override suspend fun setActive(id: String, active: Boolean): AppResult<SalonService> {
        if (fail) return error()
        toggled += id to active
        return AppResult.Success(salonService(id, active = active)).also { emitted.emit(it.data) }
    }
}

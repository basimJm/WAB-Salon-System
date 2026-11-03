package com.fab.wab.customer.core.data.catalog

import com.fab.wab.customer.core.data.contract.generated.GetCatalogServicesDataItem
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.catalog.CatalogRepository
import com.fab.wab.customer.core.domain.catalog.CatalogService
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.network.safeApiCall

class CatalogRepositoryImpl(private val api: CatalogApi) : CatalogRepository {
    override suspend fun services(gender: Gender?, businessType: BusinessType?, page: Int, pageSize: Int): AppResult<List<CatalogService>> =
        safeApiCall { api.services(gender?.code, businessType?.code, page, pageSize) }
            .mapSuccess { response -> response.data.map { it.toDomain() } }
}

fun GetCatalogServicesDataItem.toDomain(): CatalogService =
    CatalogService(id = id, name = name, description = description, imageUrl = imageUrl.takeIf { it.isNotBlank() })

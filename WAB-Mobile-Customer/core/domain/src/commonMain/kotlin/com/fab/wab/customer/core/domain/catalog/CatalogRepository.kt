package com.fab.wab.customer.core.domain.catalog

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.session.Gender

/** One admin-catalog service (`GET /catalog/services`, optionally per audience gender and type; S05 chips, S06 list, S04 presets). */
data class CatalogService(val id: String, val name: String, val description: String, val imageUrl: String?)

object CatalogDefaults {
    const val FIRST_PAGE = 1
    const val PAGE_SIZE = 10
}

interface CatalogRepository {
    /** [gender] null = every audience (discovery has no gender filter, §5.22); [businessType] null = every type. */
    suspend fun services(
        gender: Gender?,
        businessType: BusinessType? = null,
        page: Int = CatalogDefaults.FIRST_PAGE,
        pageSize: Int = CatalogDefaults.PAGE_SIZE,
    ): AppResult<List<CatalogService>>
}

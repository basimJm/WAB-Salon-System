package com.fab.wab.customer.core.domain.catalog

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.session.Gender

/** One admin-catalog service of a gender (`GET /catalog/services`; S05 chips, S06 list, S04 presets). */
data class CatalogService(val id: String, val name: String, val description: String, val imageUrl: String?)

object CatalogDefaults {
    const val FIRST_PAGE = 1
    const val PAGE_SIZE = 10
}

interface CatalogRepository {
    suspend fun services(
        gender: Gender,
        page: Int = CatalogDefaults.FIRST_PAGE,
        pageSize: Int = CatalogDefaults.PAGE_SIZE,
    ): AppResult<List<CatalogService>>
}

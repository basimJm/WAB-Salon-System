package com.fab.wab.customer.feature.salons.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.catalog.CatalogRepository
import com.fab.wab.customer.core.domain.catalog.CatalogService
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.PriceRange
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.salons.domain.repository.SalonFilterOptionsRepository

class LoadFilterServicesUseCase(private val catalog: CatalogRepository) {
    suspend operator fun invoke(gender: Gender, page: Int, businessType: BusinessType? = null): AppResult<List<CatalogService>> =
        catalog.services(gender, businessType, page)
}

class LoadPriceBoundsUseCase(private val options: SalonFilterOptionsRepository) {
    suspend operator fun invoke(gender: Gender, serviceIds: List<String>): AppResult<PriceRange?> =
        options.priceBounds(gender, serviceIds)
}

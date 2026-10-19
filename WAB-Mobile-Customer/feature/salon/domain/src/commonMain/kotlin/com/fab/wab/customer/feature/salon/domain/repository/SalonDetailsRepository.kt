package com.fab.wab.customer.feature.salon.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.salon.SalonDetails

interface SalonDetailsRepository {
    suspend fun details(salonId: String): AppResult<SalonDetails>
}

package com.fab.wab.customer.feature.salon.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.core.domain.salon.StaffMember

interface SalonDetailsRepository {
    suspend fun details(salonId: String): AppResult<SalonDetails>

    suspend fun staffMember(salonId: String, memberId: String): AppResult<StaffMember>
}

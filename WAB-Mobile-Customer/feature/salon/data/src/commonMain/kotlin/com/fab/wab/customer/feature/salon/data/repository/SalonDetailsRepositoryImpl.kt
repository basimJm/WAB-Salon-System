package com.fab.wab.customer.feature.salon.data.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.core.domain.salon.StaffMember
import com.fab.wab.customer.core.network.safeApiCall
import com.fab.wab.customer.feature.salon.data.remote.SalonDetailsApi
import com.fab.wab.customer.feature.salon.domain.repository.SalonDetailsRepository

class SalonDetailsRepositoryImpl(private val api: SalonDetailsApi) : SalonDetailsRepository {
    override suspend fun details(salonId: String): AppResult<SalonDetails> =
        safeApiCall { api.details(salonId) }.mapSuccess { it.data.toDomain() }

    override suspend fun staffMember(salonId: String, memberId: String): AppResult<StaffMember> =
        safeApiCall { api.staffMember(salonId, memberId) }.mapSuccess { it.data.toDomain() }
}

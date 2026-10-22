package com.fab.wab.customer.feature.salon.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.salon.StaffMember
import com.fab.wab.customer.feature.salon.domain.repository.SalonDetailsRepository

class GetStaffMemberUseCase(private val repository: SalonDetailsRepository) {
    suspend operator fun invoke(salonId: String, memberId: String): AppResult<StaffMember> = repository.staffMember(salonId, memberId)
}

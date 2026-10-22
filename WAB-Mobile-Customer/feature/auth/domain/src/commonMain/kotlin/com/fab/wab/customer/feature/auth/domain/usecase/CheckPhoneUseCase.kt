package com.fab.wab.customer.feature.auth.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.PhoneCheck
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.repository.AuthRepository

class CheckPhoneUseCase(private val repository: AuthRepository) {
    suspend operator fun invoke(phone: PhoneNumber, purpose: AuthPurpose): AppResult<PhoneCheck> =
        repository.checkPhone(phone, purpose)
}

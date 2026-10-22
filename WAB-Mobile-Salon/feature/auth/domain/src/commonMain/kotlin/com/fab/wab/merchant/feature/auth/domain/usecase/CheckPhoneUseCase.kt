package com.fab.wab.merchant.feature.auth.domain.usecase

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.feature.auth.domain.model.PhoneCheck
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.auth.domain.repository.AuthRepository

class CheckPhoneUseCase(private val repository: AuthRepository) {
    suspend operator fun invoke(phone: PhoneNumber): AppResult<PhoneCheck> = repository.checkPhone(phone)
}

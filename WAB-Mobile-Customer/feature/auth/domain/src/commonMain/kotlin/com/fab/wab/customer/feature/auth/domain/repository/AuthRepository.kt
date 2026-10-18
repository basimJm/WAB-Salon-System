package com.fab.wab.customer.feature.auth.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.PhoneCheck
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber

interface AuthRepository {
    suspend fun checkPhone(phone: PhoneNumber, purpose: AuthPurpose): AppResult<PhoneCheck>
}

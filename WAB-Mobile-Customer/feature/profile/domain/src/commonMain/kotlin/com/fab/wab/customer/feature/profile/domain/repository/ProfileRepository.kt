package com.fab.wab.customer.feature.profile.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.feature.profile.domain.model.CustomerAccount
import com.fab.wab.customer.feature.profile.domain.model.ProfileUpdate

interface ProfileRepository {
    suspend fun me(): AppResult<CustomerAccount>
    suspend fun update(update: ProfileUpdate): AppResult<CustomerAccount>
    suspend fun setAvatar(key: String): AppResult<CustomerAccount>
    suspend fun deleteAvatar(): AppResult<CustomerAccount>
    /** Returns the scheduled permanent-deletion instant (ISO). */
    suspend fun deleteAccount(): AppResult<String>
}

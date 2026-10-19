package com.fab.wab.customer.feature.profile.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.feature.profile.domain.model.CustomerAccount
import com.fab.wab.customer.feature.profile.domain.model.PresignedUpload

interface ProfileRepository {
    suspend fun me(): AppResult<CustomerAccount>
    suspend fun setAvatar(key: String): AppResult<CustomerAccount>
    suspend fun deleteAvatar(): AppResult<CustomerAccount>
    /** Returns the scheduled permanent-deletion instant (ISO). */
    suspend fun deleteAccount(): AppResult<String>
}

interface UploadsRepository {
    suspend fun presign(purpose: String, contentType: String, size: Int): AppResult<PresignedUpload>
    suspend fun upload(target: PresignedUpload, bytes: ByteArray, contentType: String): AppResult<Unit>
    /** Returns the final CDN URL when the backend knows it. */
    suspend fun confirm(key: String): AppResult<String?>
}

package com.fab.wab.merchant.feature.auth.domain.repository

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.feature.auth.domain.model.InstallationInfo
import com.fab.wab.merchant.feature.auth.domain.model.InstallationLink

/** `PUT /installations`: registers the device (and its FCM token) for the signed-in member. */
interface InstallationsRepository {
    suspend fun register(info: InstallationInfo, language: String): AppResult<InstallationLink>
}

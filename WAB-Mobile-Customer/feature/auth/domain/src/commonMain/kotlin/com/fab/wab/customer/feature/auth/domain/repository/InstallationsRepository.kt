package com.fab.wab.customer.feature.auth.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.feature.auth.domain.model.InstallationInfo
import com.fab.wab.customer.feature.auth.domain.model.InstallationLink

/** `PUT /installations` (works as guest; with a session the device is linked) and the account push switch. */
interface InstallationsRepository {
    suspend fun register(info: InstallationInfo, language: String): AppResult<InstallationLink>

    suspend fun setPushEnabled(enabled: Boolean): AppResult<Unit>
}

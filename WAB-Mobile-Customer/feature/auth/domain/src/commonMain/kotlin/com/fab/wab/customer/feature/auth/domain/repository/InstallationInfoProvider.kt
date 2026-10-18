package com.fab.wab.customer.feature.auth.domain.repository

import com.fab.wab.customer.feature.auth.domain.model.InstallationInfo

/** The app supplies it (Firebase app-instance id, FCM token, platform, versions). */
fun interface InstallationInfoProvider {
    suspend fun current(): InstallationInfo?
}

package com.fab.wab.merchant.feature.auth.domain.repository

import com.fab.wab.merchant.feature.auth.domain.model.InstallationInfo

/** The app supplies it (Firebase app-instance id, FCM token, platform, versions). */
fun interface InstallationInfoProvider {
    suspend fun current(): InstallationInfo?
}

package com.fab.wab.merchant.app.auth

import com.fab.wab.merchant.core.common.AppEnvironment
import com.fab.wab.merchant.core.domain.config.ClientPlatform
import com.fab.wab.merchant.core.firebase.AppInstanceIdProvider
import com.fab.wab.merchant.core.firebase.PushTokenProvider
import com.fab.wab.merchant.feature.auth.domain.model.InstallationInfo
import com.fab.wab.merchant.feature.auth.domain.repository.InstallationInfoProvider

/** Installation facts for login / register: Firebase app-instance id as the installation id, FCM token when known. */
class AppInstallationInfoProvider(
    private val environment: AppEnvironment,
    private val platform: ClientPlatform,
    private val appInstanceId: AppInstanceIdProvider,
    private val pushToken: PushTokenProvider,
    private val osVersion: String,
    private val deviceModel: String,
) : InstallationInfoProvider {

    override suspend fun current(): InstallationInfo? {
        val id = appInstanceId.appInstanceId()?.takeIf { it.isNotBlank() } ?: return null
        return InstallationInfo(
            installationId = id,
            platform = platform.code,
            appVersion = environment.appVersion,
            osVersion = osVersion.takeIf { it.isNotBlank() },
            deviceModel = deviceModel.takeIf { it.isNotBlank() },
            fcmToken = pushToken.currentToken(),
        )
    }
}

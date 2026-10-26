package com.fab.wab.customer.app.auth

import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.core.domain.config.ClientPlatform
import com.fab.wab.customer.core.firebase.AppInstanceIdProvider
import com.fab.wab.customer.core.firebase.PushTokenProvider
import com.fab.wab.customer.feature.auth.domain.model.InstallationInfo
import com.fab.wab.customer.feature.auth.domain.repository.InstallationInfoProvider

/**
 * Installation facts for login / register: the Firebase app-instance id as the installation id, FCM token when known.
 * Without an app-instance id (Firebase not configured, analytics unavailable) the app's own persisted id is used:
 * the old "unknown" marker failed the contract (`installationId` 8+ chars, `platform` enum) and blocked every sign-in
 * (CUS-092, iOS simulator).
 */
class AppInstallationInfoProvider(
    private val environment: AppEnvironment,
    private val platform: ClientPlatform,
    private val appInstanceId: AppInstanceIdProvider,
    private val pushToken: PushTokenProvider,
    private val osVersion: String,
    private val deviceModel: String,
    private val localInstallationId: suspend () -> String,
) : InstallationInfoProvider {

    override suspend fun current(): InstallationInfo {
        val id = appInstanceId.appInstanceId()?.takeIf { it.isNotBlank() } ?: localInstallationId()
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

/** The app's own installation id: read once, created (random UUID) and stored on first use, then stable. */
class LocalInstallationId(
    private val read: suspend () -> String?,
    private val write: suspend (String) -> Unit,
    private val newId: () -> String,
) {
    suspend operator fun invoke(): String =
        read()?.takeIf { it.isNotBlank() } ?: newId().also { write(it) }
}

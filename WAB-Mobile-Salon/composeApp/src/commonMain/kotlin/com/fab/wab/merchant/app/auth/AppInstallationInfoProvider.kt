package com.fab.wab.merchant.app.auth

import com.fab.wab.merchant.core.common.AppEnvironment
import com.fab.wab.merchant.core.domain.AppSettings
import com.fab.wab.merchant.core.domain.config.ClientPlatform
import com.fab.wab.merchant.core.firebase.AppInstanceIdProvider
import com.fab.wab.merchant.core.firebase.PushTokenProvider
import com.fab.wab.merchant.feature.auth.domain.model.InstallationInfo
import com.fab.wab.merchant.feature.auth.domain.repository.InstallationInfoProvider
import kotlinx.coroutines.flow.first
import kotlin.uuid.ExperimentalUuidApi
import kotlin.uuid.Uuid

/**
 * Installation facts for login / register: the Firebase app-instance id as the installation id, else this device's
 * own stored id (Firebase not configured, e.g. an iOS build without its plist: the old "unknown" marker broke the
 * contract — `installationId` 8+ characters, `platform` ANDROID / IOS — and every sign-in answered VALIDATION_ERROR,
 * found in the e2e pass); the FCM token only when there is one.
 */
class AppInstallationInfoProvider(
    private val environment: AppEnvironment,
    private val platform: ClientPlatform,
    private val appInstanceId: AppInstanceIdProvider,
    private val pushToken: PushTokenProvider,
    private val osVersion: String,
    private val deviceModel: String,
    private val localId: suspend () -> String,
) : InstallationInfoProvider {

    override suspend fun current(): InstallationInfo = InstallationInfo(
        installationId = appInstanceId.appInstanceId()?.takeIf { it.isNotBlank() } ?: localId(),
        platform = platform.code,
        appVersion = environment.appVersion,
        osVersion = osVersion.takeIf { it.isNotBlank() },
        deviceModel = deviceModel.takeIf { it.isNotBlank() },
        fcmToken = pushToken.currentToken()?.takeIf { it.isNotBlank() },
    )
}

/** This device's installation id: the stored one, or a new random id kept in the settings (survives sign-out). */
@OptIn(ExperimentalUuidApi::class)
suspend fun localInstallationId(settings: AppSettings): String =
    storedOrNewId(read = { settings.deviceId.first() }, write = settings::setDeviceId, newId = { Uuid.random().toString() })

internal suspend fun storedOrNewId(read: suspend () -> String?, write: suspend (String) -> Unit, newId: () -> String): String =
    read()?.takeIf { it.isNotBlank() } ?: newId().also { write(it) }

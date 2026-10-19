package com.fab.wab.customer.feature.auth.data.repository

import com.fab.wab.customer.core.data.contract.generated.PatchInstallationsPushEnabledBody
import com.fab.wab.customer.core.data.contract.generated.PutInstallationsBody
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.network.safeApiCall
import com.fab.wab.customer.feature.auth.data.remote.InstallationsApi
import com.fab.wab.customer.feature.auth.domain.model.InstallationInfo
import com.fab.wab.customer.feature.auth.domain.model.InstallationLink
import com.fab.wab.customer.feature.auth.domain.repository.InstallationsRepository

class InstallationsRepositoryImpl(private val api: InstallationsApi) : InstallationsRepository {

    override suspend fun register(info: InstallationInfo, language: String): AppResult<InstallationLink> =
        safeApiCall { api.register(info.toPutBody(language)) }
            .mapSuccess { InstallationLink(installationId = it.data.installationId, linked = it.data.linked) }

    override suspend fun setPushEnabled(enabled: Boolean): AppResult<Unit> =
        safeApiCall { api.setPushEnabled(PatchInstallationsPushEnabledBody(pushEnabled = enabled)) }.mapSuccess { }
}

fun InstallationInfo.toPutBody(language: String): PutInstallationsBody = PutInstallationsBody(
    installationId = installationId,
    platform = platform,
    appVersion = appVersion,
    osVersion = osVersion,
    deviceModel = deviceModel,
    fcmToken = fcmToken,
    language = language.takeIf { it.isNotBlank() },
)

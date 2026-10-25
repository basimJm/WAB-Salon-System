package com.fab.wab.merchant.feature.auth.data.repository

import com.fab.wab.merchant.core.data.contract.generated.PutInstallationsBody
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.auth.data.remote.InstallationsApi
import com.fab.wab.merchant.feature.auth.domain.model.InstallationInfo
import com.fab.wab.merchant.feature.auth.domain.model.InstallationLink
import com.fab.wab.merchant.feature.auth.domain.repository.InstallationsRepository

class InstallationsRepositoryImpl(private val api: InstallationsApi) : InstallationsRepository {

    override suspend fun register(info: InstallationInfo, language: String): AppResult<InstallationLink> =
        safeApiCall { api.register(info.toPutBody(language)) }
            .mapSuccess { InstallationLink(installationId = it.data.installationId, linked = it.data.linked) }
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

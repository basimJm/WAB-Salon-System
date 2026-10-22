package com.fab.wab.merchant.app.di

import com.fab.wab.merchant.PlatformNames
import com.fab.wab.merchant.app.auth.AppInstallationInfoProvider
import com.fab.wab.merchant.core.domain.config.ClientPlatform
import com.fab.wab.merchant.feature.auth.domain.repository.InstallationInfoProvider
import com.fab.wab.merchant.getPlatform
import org.koin.dsl.module

/** Host facts: the store platform the config call reports and the installation record login sends. */
val appPlatformModule = module {
    single<ClientPlatform> { clientPlatformOf(getPlatform().analyticsName) }
    single<InstallationInfoProvider> {
        val platform = getPlatform()
        AppInstallationInfoProvider(
            environment = get(),
            platform = get(),
            appInstanceId = get(),
            pushToken = get(),
            osVersion = platform.osVersion,
            deviceModel = platform.deviceModel,
        )
    }
}

fun clientPlatformOf(platformName: String): ClientPlatform =
    if (platformName == PlatformNames.IOS) ClientPlatform.IOS else ClientPlatform.ANDROID

package com.fab.wab.customer.app.di

import com.fab.wab.customer.PlatformNames
import com.fab.wab.customer.app.auth.AppInstallationInfoProvider
import com.fab.wab.customer.app.auth.InstallationSyncer
import com.fab.wab.customer.core.domain.AppSettings
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.firebase.PushTokenProvider
import com.fab.wab.customer.core.domain.config.ClientPlatform
import com.fab.wab.customer.feature.auth.domain.repository.InstallationInfoProvider
import com.fab.wab.customer.getPlatform
import org.koin.dsl.module

/** Host facts: the store platform the config call reports and the installation record login / register send. */
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

/** Registered device record (PRD §10.2 / §14); started by the shell view model. */
val installationSyncModule = module {
    single {
        InstallationSyncer(
            sync = get(),
            session = get<SessionStore>().state,
            language = get<AppSettings>().language,
            pushTokens = get<PushTokenProvider>().tokenUpdates,
        )
    }
}

fun clientPlatformOf(platformName: String): ClientPlatform =
    if (platformName == PlatformNames.IOS) ClientPlatform.IOS else ClientPlatform.ANDROID

package com.fab.wab.customer.app.di

import com.fab.wab.customer.PlatformNames
import com.fab.wab.customer.core.domain.config.ClientPlatform
import com.fab.wab.customer.getPlatform
import org.koin.dsl.module

/** Host facts: the store platform reported to the backend config call. */
val appPlatformModule = module {
    single<ClientPlatform> { clientPlatformOf(getPlatform().analyticsName) }
}

fun clientPlatformOf(platformName: String): ClientPlatform =
    if (platformName == PlatformNames.IOS) ClientPlatform.IOS else ClientPlatform.ANDROID

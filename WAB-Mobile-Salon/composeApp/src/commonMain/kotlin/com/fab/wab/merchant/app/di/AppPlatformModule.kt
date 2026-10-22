package com.fab.wab.merchant.app.di

import com.fab.wab.merchant.PlatformNames
import com.fab.wab.merchant.core.domain.config.ClientPlatform
import com.fab.wab.merchant.getPlatform
import org.koin.dsl.module

/** Host facts: the store platform the config call reports. */
val appPlatformModule = module {
    single<ClientPlatform> { clientPlatformOf(getPlatform().analyticsName) }
}

fun clientPlatformOf(platformName: String): ClientPlatform =
    if (platformName == PlatformNames.IOS) ClientPlatform.IOS else ClientPlatform.ANDROID

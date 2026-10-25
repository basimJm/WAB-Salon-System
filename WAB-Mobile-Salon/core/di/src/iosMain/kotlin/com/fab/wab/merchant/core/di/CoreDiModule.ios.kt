package com.fab.wab.merchant.core.di

import com.fab.wab.merchant.core.data.location.DeviceLocationProviderIOS
import com.fab.wab.merchant.core.data.location.IosReverseGeocoder
import com.fab.wab.merchant.core.domain.location.ReverseGeocoder
import com.fab.wab.merchant.core.domain.provider.DeviceLocationProvider
import org.koin.dsl.module

actual val deviceLocationProviderModule = module {
    single<DeviceLocationProvider> { DeviceLocationProviderIOS() }
    single<ReverseGeocoder> { IosReverseGeocoder() }
}

val coreDiModuleIos = module {
    // iOS-specific dependencies can be added here
}

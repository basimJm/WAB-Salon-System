package com.fab.wab.customer.core.di

import com.fab.wab.customer.core.data.location.DeviceLocationProviderIOS
import com.fab.wab.customer.core.domain.provider.DeviceLocationProvider
import org.koin.dsl.module

actual val deviceLocationProviderModule = module {
    single<DeviceLocationProvider> { DeviceLocationProviderIOS() }
}

val coreDiModuleIos = module {
    // iOS-specific dependencies can be added here
}

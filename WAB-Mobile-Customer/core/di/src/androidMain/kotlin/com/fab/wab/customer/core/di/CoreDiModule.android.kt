package com.fab.wab.customer.core.di

import android.content.Context
import com.fab.wab.customer.core.data.location.DeviceLocationProviderAndroid
import com.fab.wab.customer.core.domain.provider.DeviceLocationProvider
import org.koin.core.module.Module
import org.koin.dsl.module

actual val deviceLocationProviderModule: Module = module {
    single<DeviceLocationProvider> { DeviceLocationProviderAndroid(get<Context>()) }
}

package com.fab.wab.merchant.core.di

import android.content.Context
import com.fab.wab.merchant.core.data.location.DeviceLocationProviderAndroid
import com.fab.wab.merchant.core.domain.provider.DeviceLocationProvider
import org.koin.core.module.Module
import org.koin.dsl.module

actual val deviceLocationProviderModule: Module = module {
    single<DeviceLocationProvider> { DeviceLocationProviderAndroid() }
}

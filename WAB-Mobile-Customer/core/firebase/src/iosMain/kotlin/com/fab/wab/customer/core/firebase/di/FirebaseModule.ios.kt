package com.fab.wab.customer.core.firebase.di

import com.fab.wab.customer.core.analytics.AnalyticsBackend
import com.fab.wab.customer.core.firebase.AppInstanceIdProvider
import com.fab.wab.customer.core.firebase.CrashReporter
import com.fab.wab.customer.core.firebase.IosAppInstanceIdProvider
import com.fab.wab.customer.core.firebase.IosCrashReporter
import com.fab.wab.customer.core.firebase.IosFirebaseAnalyticsBackend
import com.fab.wab.customer.core.firebase.IosPushTokenProvider
import com.fab.wab.customer.core.firebase.PushTokenProvider
import org.koin.core.module.Module
import org.koin.dsl.module

actual fun platformFirebaseModule(): Module = module {
    single<PushTokenProvider> { IosPushTokenProvider() }
    single<CrashReporter> { IosCrashReporter() }
    single<AnalyticsBackend> { IosFirebaseAnalyticsBackend() }
    single<AppInstanceIdProvider> { IosAppInstanceIdProvider() }
}

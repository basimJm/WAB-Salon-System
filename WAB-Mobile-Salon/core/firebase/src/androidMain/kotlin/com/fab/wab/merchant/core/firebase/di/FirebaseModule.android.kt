package com.fab.wab.merchant.core.firebase.di

import com.fab.wab.merchant.core.analytics.AnalyticsBackend
import com.fab.wab.merchant.core.firebase.AndroidAppInstanceIdProvider
import com.fab.wab.merchant.core.firebase.AndroidCrashReporter
import com.fab.wab.merchant.core.firebase.AppInstanceIdProvider
import com.fab.wab.merchant.core.firebase.AndroidFirebaseAnalyticsBackend
import com.fab.wab.merchant.core.firebase.AndroidPushTokenProvider
import com.fab.wab.merchant.core.firebase.CrashReporter
import com.fab.wab.merchant.core.firebase.PushTokenProvider
import org.koin.android.ext.koin.androidContext
import org.koin.core.module.Module
import org.koin.dsl.module

actual fun platformFirebaseModule(): Module = module {
    single<PushTokenProvider> { AndroidPushTokenProvider() }
    single<CrashReporter> { AndroidCrashReporter() }
    single<AnalyticsBackend> { AndroidFirebaseAnalyticsBackend(androidContext()) }
    single<AppInstanceIdProvider> { AndroidAppInstanceIdProvider(androidContext()) }
}

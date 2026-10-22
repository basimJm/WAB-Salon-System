package com.fab.wab.merchant.core.firebase.di

import com.fab.wab.merchant.core.analytics.AnalyticsBackend
import com.fab.wab.merchant.core.firebase.AppInstanceIdProvider
import com.fab.wab.merchant.core.firebase.CrashReporter
import com.fab.wab.merchant.core.firebase.IosAppInstanceIdProvider
import com.fab.wab.merchant.core.firebase.IosCrashReporter
import com.fab.wab.merchant.core.firebase.IosFirebaseAnalyticsBackend
import com.fab.wab.merchant.core.firebase.IosPhoneAuthGateway
import com.fab.wab.merchant.core.firebase.IosPushTokenProvider
import com.fab.wab.merchant.core.firebase.PhoneAuthGateway
import com.fab.wab.merchant.core.firebase.PushTokenProvider
import org.koin.core.module.Module
import org.koin.dsl.module

actual fun platformFirebaseModule(): Module = module {
    single<PhoneAuthGateway> { IosPhoneAuthGateway() }
    single<PushTokenProvider> { IosPushTokenProvider() }
    single<CrashReporter> { IosCrashReporter() }
    single<AnalyticsBackend> { IosFirebaseAnalyticsBackend() }
    single<AppInstanceIdProvider> { IosAppInstanceIdProvider() }
}

package com.fab.wab.customer.core.firebase.di

import com.fab.wab.customer.core.analytics.AnalyticsBackend
import com.fab.wab.customer.core.firebase.CrashReporter
import com.fab.wab.customer.core.firebase.IosCrashReporter
import com.fab.wab.customer.core.firebase.IosFirebaseAnalyticsBackend
import com.fab.wab.customer.core.firebase.IosPhoneAuthGateway
import com.fab.wab.customer.core.firebase.IosPushTokenProvider
import com.fab.wab.customer.core.firebase.PhoneAuthGateway
import com.fab.wab.customer.core.firebase.PushTokenProvider
import org.koin.core.module.Module
import org.koin.dsl.module

actual fun platformFirebaseModule(): Module = module {
    single<PhoneAuthGateway> { IosPhoneAuthGateway() }
    single<PushTokenProvider> { IosPushTokenProvider() }
    single<CrashReporter> { IosCrashReporter() }
    single<AnalyticsBackend> { IosFirebaseAnalyticsBackend() }
}

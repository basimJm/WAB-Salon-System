package com.fab.wab.customer.core.firebase.di

import android.app.Activity
import com.fab.wab.customer.core.analytics.AnalyticsBackend
import com.fab.wab.customer.core.firebase.AndroidCrashReporter
import com.fab.wab.customer.core.firebase.AndroidFirebaseAnalyticsBackend
import com.fab.wab.customer.core.firebase.AndroidPhoneAuthGateway
import com.fab.wab.customer.core.firebase.AndroidPushTokenProvider
import com.fab.wab.customer.core.firebase.CrashReporter
import com.fab.wab.customer.core.firebase.CurrentActivityProvider
import com.fab.wab.customer.core.firebase.PhoneAuthGateway
import com.fab.wab.customer.core.firebase.PushTokenProvider
import org.koin.android.ext.koin.androidContext
import org.koin.core.module.Module
import org.koin.dsl.module

/** Koin property `MainActivity` sets in `onResume`; the phone-auth flow needs that Activity. */
const val ANDROID_ACTIVITY_PROPERTY = "androidActivity"

actual fun platformFirebaseModule(): Module = module {
    single<CurrentActivityProvider> { CurrentActivityProvider { getKoin().getProperty<Activity>(ANDROID_ACTIVITY_PROPERTY) } }
    single<PhoneAuthGateway> { AndroidPhoneAuthGateway(activityProvider = get()) }
    single<PushTokenProvider> { AndroidPushTokenProvider() }
    single<CrashReporter> { AndroidCrashReporter() }
    single<AnalyticsBackend> { AndroidFirebaseAnalyticsBackend(androidContext()) }
}

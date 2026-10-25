package com.fab.wab.merchant.core.firebase.di

import android.app.Activity
import com.fab.wab.merchant.core.analytics.AnalyticsBackend
import com.fab.wab.merchant.core.firebase.AndroidAppInstanceIdProvider
import com.fab.wab.merchant.core.firebase.AndroidCrashReporter
import com.fab.wab.merchant.core.firebase.AppInstanceIdProvider
import com.fab.wab.merchant.core.firebase.AndroidFirebaseAnalyticsBackend
import com.fab.wab.merchant.core.firebase.AndroidPhoneAuthGateway
import com.fab.wab.merchant.core.firebase.AndroidPushTokenProvider
import com.fab.wab.merchant.core.firebase.CrashReporter
import com.fab.wab.merchant.core.firebase.CurrentActivityProvider
import com.fab.wab.merchant.core.firebase.PhoneAuthGateway
import com.fab.wab.merchant.core.firebase.PushTokenProvider
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
    single<AppInstanceIdProvider> { AndroidAppInstanceIdProvider(androidContext()) }
}

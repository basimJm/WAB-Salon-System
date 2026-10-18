package com.fab.wab.customer.core.firebase.di

import org.koin.core.module.Module

/**
 * Binds `PhoneAuthGateway`, `PushTokenProvider`, `CrashReporter` and the analytics `AnalyticsBackend` to the
 * platform's Firebase implementation (Android SDK; iOS Swift bridges). Tests bind the fakes instead.
 */
expect fun platformFirebaseModule(): Module

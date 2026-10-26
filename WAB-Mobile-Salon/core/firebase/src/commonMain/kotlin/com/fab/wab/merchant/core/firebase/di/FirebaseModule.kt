package com.fab.wab.merchant.core.firebase.di

import org.koin.core.module.Module

/**
 * Binds `PushTokenProvider`, `CrashReporter` and the analytics `AnalyticsBackend` to the
 * platform's Firebase implementation (Android SDK; iOS Swift bridges). Tests bind the fakes instead. Phone OTP is not
 * Firebase: the backend sends WhatsApp codes (MER-070).
 */
expect fun platformFirebaseModule(): Module

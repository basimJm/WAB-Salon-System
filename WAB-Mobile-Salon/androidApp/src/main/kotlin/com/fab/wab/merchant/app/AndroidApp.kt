package com.fab.wab.merchant.app

import android.app.Application
import android.util.Log
import com.fab.wab.merchant.core.domain.AppSettings
import com.fab.wab.merchant.core.firebase.PushTokenProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.koin.java.KoinJavaComponent.getKoin
import com.fab.wab.merchant.app.ui.appModules
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.GlobalContext.startKoin

class AndroidApp : Application() {

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        // App Check before any Firebase Auth / Phone Auth call (Play Integrity in release, debug provider in debug).
        installAppCheck(this)
        startKoin {
            androidContext(this@AndroidApp)
            properties(mapOf("androidContext" to this@AndroidApp))
            modules(appModules + appEnvironmentModule)
        }

        // FCM token: register (FCM 26) and store it; MyFirebaseMessagingService.onRegistered also stores later refreshes.
        val appSettings: AppSettings = getKoin().get()
        val pushTokens: PushTokenProvider = getKoin().get()
        appScope.launch {
            val token = pushTokens.currentToken()
            if (token != null) {
                appSettings.setFcmToken(token)
                Log.d(FCM_TAG, "Token stored")
            } else {
                Log.w(FCM_TAG, "No FCM token (Firebase not configured or registration failed)")
            }
        }
    }
}

private const val FCM_TAG = "FCM"

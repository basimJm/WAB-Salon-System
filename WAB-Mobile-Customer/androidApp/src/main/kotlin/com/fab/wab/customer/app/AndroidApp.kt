package com.fab.wab.customer.app

import android.app.Application
import android.util.Log
import com.fab.wab.customer.core.domain.AppSettings
import com.fab.wab.customer.core.firebase.PushTokenProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.koin.java.KoinJavaComponent.getKoin
import com.fab.wab.customer.app.ui.appModules
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.GlobalContext.startKoin

class AndroidApp : Application() {

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidContext(this@AndroidApp)
            properties(mapOf("androidContext" to this@AndroidApp))
            modules(appModules + appEnvironmentModule)
        }

        // FCM token: register (FCM 26) and store it; MyFirebaseMessagingService.onRegistered also stores later refreshes.
        // Resolved on the IO scope (CUS-095): building the DataStore-backed settings and the Firebase provider stays
        // off the main thread, so it never delays the first frame.
        // A failed registration is logged by AndroidPushTokenProvider (tag FCM) with its exception class and message.
        appScope.launch {
            val appSettings: AppSettings = getKoin().get()
            val pushTokens: PushTokenProvider = getKoin().get()
            val token = pushTokens.currentToken()
            if (token != null) {
                appSettings.setFcmToken(token)
                Log.d(FCM_TAG, "Token stored")
            } else {
                Log.w(FCM_TAG, "No FCM token stored; the registration failure is logged just before")
            }
        }
    }
}

private const val FCM_TAG = "FCM"

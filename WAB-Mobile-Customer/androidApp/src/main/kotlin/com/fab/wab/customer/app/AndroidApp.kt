package com.fab.wab.customer.app

import android.app.Application
import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging
import com.fab.wab.customer.app.ui.appModules
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.GlobalContext.startKoin

class AndroidApp : Application() {

    override fun onCreate() {
        super.onCreate()
        // App Check before any Firebase Auth / Phone Auth call (Play Integrity in release, debug provider in debug).
        installAppCheck(this)
        startKoin {
            androidContext(this@AndroidApp)
            properties(mapOf("androidContext" to this@AndroidApp))
            modules(appModules + appEnvironmentModule)
        }

        // FCM 26: register(); the token is delivered to MyFirebaseMessagingService.onRegistered, which saves it.
        runCatching { FirebaseMessaging.getInstance().register() }
            .onFailure { Log.e("FCM", "Push registration not started", it) }
    }
}

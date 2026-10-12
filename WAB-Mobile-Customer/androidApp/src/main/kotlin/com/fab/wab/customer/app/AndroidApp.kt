package com.fab.wab.customer.app

import android.app.Application
import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging
import com.fab.wab.customer.app.ui.appModules
import com.fab.wab.customer.core.domain.AppSettings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.GlobalContext.startKoin

class AndroidApp : Application() {

    private val appScope = CoroutineScope(Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidContext(this@AndroidApp)
            properties(mapOf("androidContext" to this@AndroidApp))
            modules(appModules)
        }

        val appSettings: AppSettings = org.koin.java.KoinJavaComponent.getKoin().get()

        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                appScope.launch {
                    appSettings.setFcmToken(token)
                    Log.d("FCM", "Token saved successfully")
                }
            } else {
                Log.e("FCM", "Failed to fetch token", task.exception)
            }
        }
    }
}
package com.fab.wab.customer

import androidx.compose.ui.window.ComposeUIViewController
import com.fab.wab.customer.app.ui.App
import com.fab.wab.customer.app.ui.appModules
import com.fab.wab.customer.core.domain.AppSettings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.koin.core.context.startKoin
import org.koin.mp.KoinPlatform

fun MainViewController() = ComposeUIViewController {
    App(null)
}

// Called from AppDelegate.swift, so the compiler sees no Kotlin caller.
@Suppress("unused")
fun initKoin() {
    startKoin {
        modules(appModules + iosAppEnvironmentModule())
    }
}

// Called from AppDelegate.swift, so the compiler sees no Kotlin caller.
@Suppress("unused")
fun saveFcmToken(token: String) {
    val appSettings: AppSettings = KoinPlatform.getKoin().get()
    CoroutineScope(Dispatchers.Main).launch {
        appSettings.setFcmToken(token)
    }
}

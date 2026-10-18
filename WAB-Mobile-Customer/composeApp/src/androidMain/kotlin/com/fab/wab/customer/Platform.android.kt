package com.fab.wab.customer

import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.net.toUri
import org.koin.mp.KoinPlatform
import kotlin.system.exitProcess

class AndroidPlatform : Platform {
    override val name: String = "Android ${Build.VERSION.SDK_INT}"
    override val analyticsName: String = PlatformNames.ANDROID
}

actual fun getPlatform(): Platform = AndroidPlatform()

actual fun openStoreLink(url: String?) {
    val target = url?.takeIf { it.isNotBlank() } ?: return
    val intent = Intent(Intent.ACTION_VIEW, target.toUri()).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    val context = KoinPlatform.getKoin().getProperty<Context>("androidContext")
    context?.startActivity(intent)
}

actual fun exitApp() {
    exitProcess(0)
}

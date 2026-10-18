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

// TODO: replace it with real link
actual fun openStoreLink() {
    val url = "https://play.google.com/store/apps/details?id=com.facebook.katana&hl=en"
    val intent = Intent(Intent.ACTION_VIEW, url.toUri()).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    val context = KoinPlatform.getKoin().getProperty<Context>("androidContext")

    context?.startActivity(intent)
}

actual fun exitApp() {
    exitProcess(0)
}

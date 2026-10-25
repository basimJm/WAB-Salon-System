package com.fab.wab.merchant.core.data.places

import android.content.Context
import android.content.pm.PackageManager
import org.koin.mp.KoinPlatform

private const val ANDROID_CONTEXT_PROPERTY = "androidContext"
private const val MAPS_KEY_META_DATA = "com.google.android.geo.API_KEY"
private const val NO_CONTEXT = "Android context not available"

/**
 * Android implementation of PlacesApiConfig.
 * Reads the API key from AndroidManifest.xml meta-data; an empty key disables Places.
 */
actual object PlacesApiConfig {
    actual val apiKey: String
        get() {
            val context = KoinPlatform.getKoin().getProperty<Context>(ANDROID_CONTEXT_PROPERTY) ?: error(NO_CONTEXT)
            return try {
                val appInfo = context.packageManager.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
                appInfo.metaData?.getString(MAPS_KEY_META_DATA).orEmpty()
            } catch (ignored: PackageManager.NameNotFoundException) {
                ""
            }
        }
}

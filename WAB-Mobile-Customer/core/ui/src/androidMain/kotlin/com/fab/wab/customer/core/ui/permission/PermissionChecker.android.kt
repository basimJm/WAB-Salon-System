package com.fab.wab.customer.core.ui.permission

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.Build
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import org.koin.mp.KoinPlatform

private const val NotificationPermissionRequestCode = 9033

private object NotificationPermissionState {
    var hasRequested: Boolean = false
}

actual fun isNotificationPermissionGranted(): Boolean {
    val context = KoinPlatform.getKoin().getProperty<Context>("androidContext")
    return if (Build.VERSION.SDK_INT >= 33) {
        NotificationManagerCompat.from(context!!).areNotificationsEnabled()
    } else {
        true
    }
}

actual fun requestNotificationPermissionOnHomeLanding() {
    val activity = KoinPlatform.getKoin().getProperty<Activity>("androidActivity") ?: return
    val permission = Manifest.permission.POST_NOTIFICATIONS

    (Build.VERSION.SDK_INT >= 33)
        .takeIf { it }
        ?.takeUnless {
            ContextCompat.checkSelfPermission(
                activity,
                permission,
            ) == PackageManager.PERMISSION_GRANTED
        }
        ?.let {
            NotificationPermissionState.hasRequested
                .takeIf { requested ->
                    requested && !ActivityCompat.shouldShowRequestPermissionRationale(
                        activity,
                        permission,
                    )
                }
                ?.let { openAppSettings() }
                ?: ActivityCompat.requestPermissions(
                    activity,
                    arrayOf(permission),
                    NotificationPermissionRequestCode,
                ).also {
                    NotificationPermissionState.hasRequested = true
                }
        }
}

actual fun openAppSettings() {
    val context = KoinPlatform.getKoin().getProperty<Context>("androidContext")
    Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
        putExtra(Settings.EXTRA_APP_PACKAGE, context?.packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context?.startActivity(this)
    }
}

actual fun isLocationPermissionGranted(): Boolean {
    val context = KoinPlatform.getKoin().getProperty<Context>("androidContext")
    return ContextCompat.checkSelfPermission(
        context!!,
        Manifest.permission.ACCESS_COARSE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED
}

actual fun openLocationSettings() {
    val context = KoinPlatform.getKoin().getProperty<Context>("androidContext")
    Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context?.startActivity(this)
    }
}

actual fun isGPSEnabled(): Boolean {
    val context = KoinPlatform.getKoin().getProperty<Context>("androidContext")
    val locationManager = context?.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
    return locationManager?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true
}

actual fun openGPSSettings() {
    val context = KoinPlatform.getKoin().getProperty<Context>("androidContext")
    Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context?.startActivity(this)
    }
}

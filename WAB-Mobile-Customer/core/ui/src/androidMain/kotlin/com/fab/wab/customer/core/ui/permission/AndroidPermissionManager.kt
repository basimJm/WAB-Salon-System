package com.fab.wab.customer.core.ui.permission

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.LocationManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat

private const val PACKAGE_URI_SCHEME = "package"

class AndroidPermissionManager(
    private val context: Context,
    private val bridge: AndroidPermissionBridge,
) : PermissionManager {

    // Android cannot tell "never asked" from "refused for good" without this memory plus the rationale flag.
    private val asked = mutableSetOf<AppPermission>()

    private fun manifestPermissions(permission: AppPermission): List<String> = when (permission) {
        AppPermission.NOTIFICATIONS ->
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                listOf(Manifest.permission.POST_NOTIFICATIONS)
            } else {
                emptyList()
            }

        AppPermission.LOCATION -> listOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        )

        AppPermission.CAMERA -> listOf(Manifest.permission.CAMERA)
    }

    private fun isHeld(name: String): Boolean =
        ContextCompat.checkSelfPermission(context, name) == PackageManager.PERMISSION_GRANTED

    private fun isGranted(permission: AppPermission): Boolean = when (permission) {
        AppPermission.NOTIFICATIONS -> NotificationManagerCompat.from(context).areNotificationsEnabled()
        AppPermission.LOCATION -> manifestPermissions(permission).any(::isHeld)
        AppPermission.CAMERA -> manifestPermissions(permission).all(::isHeld)
    }

    private fun canStillAsk(permission: AppPermission): Boolean {
        val names = manifestPermissions(permission)
        val activity = bridge.activity
        return when {
            names.isEmpty() || activity == null -> false
            permission !in asked -> true
            else -> names.any { ActivityCompat.shouldShowRequestPermissionRationale(activity, it) }
        }
    }

    override suspend fun status(permission: AppPermission): PermissionStatus = when {
        isGranted(permission) -> PermissionStatus.GRANTED
        canStillAsk(permission) -> PermissionStatus.DENIED
        else -> PermissionStatus.DENIED_PERMANENTLY
    }

    override suspend fun request(permission: AppPermission): PermissionStatus {
        if (isGranted(permission)) return PermissionStatus.GRANTED
        if (!canStillAsk(permission)) return status(permission)
        asked += permission
        bridge.request(manifestPermissions(permission).toTypedArray())
        return status(permission)
    }

    override fun openSettings(permission: AppPermission) {
        val intent = when (permission) {
            AppPermission.NOTIFICATIONS -> Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)

            else -> Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                .setData(Uri.fromParts(PACKAGE_URI_SCHEME, context.packageName, null))
        }
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    override fun isLocationServiceEnabled(): Boolean =
        ContextCompat.getSystemService(context, LocationManager::class.java)
            ?.let(LocationManagerCompat::isLocationEnabled)
            ?: false

    override fun openLocationServiceSettings() {
        context.startActivity(
            Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }
}

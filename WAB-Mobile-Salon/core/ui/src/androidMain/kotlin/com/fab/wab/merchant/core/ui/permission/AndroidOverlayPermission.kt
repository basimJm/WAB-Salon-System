package com.fab.wab.merchant.core.ui.permission

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings

private const val PACKAGE_SCHEME = "package"

/** `Settings.canDrawOverlays` + `ACTION_MANAGE_OVERLAY_PERMISSION` for this package. */
class AndroidOverlayPermission(private val context: Context) : OverlayPermission {
    override val isSupported: Boolean = true

    override fun isGranted(): Boolean = Settings.canDrawOverlays(context)

    override fun openSettings() {
        val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.fromParts(PACKAGE_SCHEME, context.packageName, null))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            context.startActivity(intent)
        } catch (missing: ActivityNotFoundException) {
            // Some OEM builds hide the screen; the member can still enable it from the app's system settings.
            runCatching {
                context.startActivity(
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts(PACKAGE_SCHEME, context.packageName, null))
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                )
            }
        }
    }
}

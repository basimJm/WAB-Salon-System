package com.fab.wab.merchant.core.data.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.core.domain.provider.DeviceLocationProvider
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.google.android.gms.tasks.Task
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Fused location: one fresh fix (`getCurrentLocation`, bounded by [FRESH_FIX_TIMEOUT_MS]), else the last known one.
 * Every failure (no Play services, permission revoked meanwhile, no fix) answers null instead of throwing or waiting
 * forever; the map picker bounds the whole wait and explains.
 */
class DeviceLocationProviderAndroid(private val context: Context) : DeviceLocationProvider {

    // The map picker asks PermissionFlow for LOCATION before calling; a revoked permission lands in the catch.
    @SuppressLint("MissingPermission")
    override suspend fun currentLocation(): LocationData? = try {
        val client = LocationServices.getFusedLocationProviderClient(context)
        val cancellation = CancellationTokenSource()
        freshOrLastKnown(
            fresh = {
                client.getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, cancellation.token).awaitOrNull {
                    cancellation.cancel()
                }
            },
            lastKnown = { client.lastLocation.awaitOrNull() },
        )?.toData()
    } catch (ignored: SecurityException) {
        null
    }

    private fun Location.toData() = LocationData(latitude = latitude, longitude = longitude)

    private suspend fun Task<Location?>.awaitOrNull(onCancel: () -> Unit = {}): Location? = suspendCancellableCoroutine { continuation ->
        continuation.invokeOnCancellation { onCancel() }
        addOnCompleteListener { task ->
            if (continuation.isActive) continuation.resume(if (task.isSuccessful) task.result else null)
        }
    }
}

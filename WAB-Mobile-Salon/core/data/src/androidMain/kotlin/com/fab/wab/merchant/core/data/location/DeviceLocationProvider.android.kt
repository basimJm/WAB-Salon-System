package com.fab.wab.merchant.core.data.location

import android.Manifest
import android.content.Context
import android.os.Looper
import androidx.annotation.RequiresPermission
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority.PRIORITY_BALANCED_POWER_ACCURACY
import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.core.domain.provider.DeviceLocationProvider
import org.koin.mp.KoinPlatform


private const val ANDROID_CONTEXT_PROPERTY = "androidContext"
private const val LOCATION_INTERVAL_MS = 10_000L
private const val LOCATION_MIN_INTERVAL_MS = 5_000L

class DeviceLocationProviderAndroid : DeviceLocationProvider {
    @RequiresPermission(allOf = [Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION])
    override fun fetchCurrentLocation(onResult: (LocationData?) -> Unit) {
        val context = KoinPlatform.getKoin().getProperty<Context>(ANDROID_CONTEXT_PROPERTY) ?: return onResult(null)
        val fusedLocationClient: FusedLocationProviderClient =
            LocationServices.getFusedLocationProviderClient(context)

        val locationRequest = LocationRequest.Builder(PRIORITY_BALANCED_POWER_ACCURACY, LOCATION_INTERVAL_MS)
            .setWaitForAccurateLocation(false)
            .setMinUpdateIntervalMillis(LOCATION_MIN_INTERVAL_MS)
            .setMaxUpdates(1)
            .build()

        val locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    onResult(
                        LocationData(
                            latitude = location.latitude,
                            longitude = location.longitude,
                        )
                    )
                } ?: onResult(null)
                fusedLocationClient.removeLocationUpdates(this)
            }
        }

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )
    }
}

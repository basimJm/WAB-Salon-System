package com.fab.wab.customer.core.data.location

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
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.provider.DeviceLocationProvider
import org.koin.mp.KoinPlatform


class DeviceLocationProviderAndroid : DeviceLocationProvider {
    @RequiresPermission(allOf = [Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION])
    override fun fetchCurrentLocation(onResult: (LocationData?) -> Unit) {
        val context = KoinPlatform.getKoin().getProperty<Context>("androidContext")
        val fusedLocationClient: FusedLocationProviderClient =
            LocationServices.getFusedLocationProviderClient(context!!)

        val locationRequest = LocationRequest.Builder(PRIORITY_BALANCED_POWER_ACCURACY, 10000)
            .setWaitForAccurateLocation(false)
            .setMinUpdateIntervalMillis(5000)
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

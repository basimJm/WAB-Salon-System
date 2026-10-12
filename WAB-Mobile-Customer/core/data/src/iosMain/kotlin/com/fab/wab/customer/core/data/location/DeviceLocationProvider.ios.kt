package com.fab.wab.customer.core.data.location

import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.provider.DeviceLocationProvider
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.useContents
import platform.CoreLocation.CLLocationManager


class DeviceLocationProviderIOS : DeviceLocationProvider {
    @OptIn(ExperimentalForeignApi::class)
    override fun fetchCurrentLocation(onResult: (LocationData?) -> Unit) {
        val locationManager = CLLocationManager()

        if (locationManager.authorizationStatus != 3 && locationManager.authorizationStatus != 4) {
            locationManager.requestWhenInUseAuthorization()
            onResult(null)
            return
        }

        val location = locationManager.location
        if (location != null) {
            location.coordinate.useContents {
                onResult(LocationData(latitude = latitude, longitude = longitude))
            }
        } else {
            onResult(null)
        }
    }
}

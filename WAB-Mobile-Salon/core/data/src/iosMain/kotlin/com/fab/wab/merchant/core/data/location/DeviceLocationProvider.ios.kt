package com.fab.wab.merchant.core.data.location

import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.core.domain.provider.DeviceLocationProvider
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.useContents
import platform.CoreLocation.CLLocationManager
import platform.CoreLocation.kCLAuthorizationStatusAuthorizedAlways
import platform.CoreLocation.kCLAuthorizationStatusAuthorizedWhenInUse


class DeviceLocationProviderIOS : DeviceLocationProvider {
    @OptIn(ExperimentalForeignApi::class)
    override fun fetchCurrentLocation(onResult: (LocationData?) -> Unit) {
        val locationManager = CLLocationManager()

        if (locationManager.authorizationStatus != kCLAuthorizationStatusAuthorizedAlways &&
            locationManager.authorizationStatus != kCLAuthorizationStatusAuthorizedWhenInUse
        ) {
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

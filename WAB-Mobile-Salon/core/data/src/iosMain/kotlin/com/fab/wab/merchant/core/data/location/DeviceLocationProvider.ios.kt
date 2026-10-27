package com.fab.wab.merchant.core.data.location

import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.core.domain.provider.DeviceLocationProvider
import kotlin.coroutines.resume
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.useContents
import kotlinx.coroutines.suspendCancellableCoroutine
import platform.CoreLocation.CLLocation
import platform.CoreLocation.CLLocationManager
import platform.CoreLocation.CLLocationManagerDelegateProtocol
import platform.CoreLocation.kCLLocationAccuracyHundredMeters
import platform.Foundation.NSError
import platform.darwin.NSObject

/**
 * One-shot `requestLocation()`: CoreLocation reports the fix (or an error) to its delegate. The cached
 * `CLLocationManager().location` used before is nil on a fresh manager, so "Use my location" never found anything.
 * CoreLocation keeps the delegate weakly: the manager and the delegate are held here until the answer arrives.
 */
@OptIn(ExperimentalForeignApi::class)
class DeviceLocationProviderIOS : DeviceLocationProvider {
    private var manager: CLLocationManager? = null
    private var delegate: OneShotDelegate? = null

    override suspend fun currentLocation(): LocationData? = suspendCancellableCoroutine { continuation ->
        val locationManager = CLLocationManager()
        val answer = OneShotDelegate { point ->
            release()
            if (continuation.isActive) continuation.resume(point)
        }
        manager = locationManager
        delegate = answer
        locationManager.delegate = answer
        locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        continuation.invokeOnCancellation { release() }
        locationManager.requestLocation()
    }

    private fun release() {
        manager?.stopUpdatingLocation()
        manager?.delegate = null
        manager = null
        delegate = null
    }

    private class OneShotDelegate(private val onAnswer: (LocationData?) -> Unit) : NSObject(), CLLocationManagerDelegateProtocol {
        override fun locationManager(manager: CLLocationManager, didUpdateLocations: List<*>) {
            val last = didUpdateLocations.lastOrNull() as? CLLocation
            onAnswer(last?.coordinate?.useContents { LocationData(latitude = latitude, longitude = longitude) })
        }

        override fun locationManager(manager: CLLocationManager, didFailWithError: NSError) {
            onAnswer(null)
        }
    }
}

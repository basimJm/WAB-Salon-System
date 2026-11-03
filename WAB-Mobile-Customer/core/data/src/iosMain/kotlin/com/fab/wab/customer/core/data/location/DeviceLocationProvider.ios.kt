package com.fab.wab.customer.core.data.location

import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.provider.DeviceLocationProvider
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.useContents
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import platform.CoreLocation.CLLocation
import platform.CoreLocation.CLLocationManager
import platform.CoreLocation.CLLocationManagerDelegateProtocol
import platform.CoreLocation.kCLAuthorizationStatusAuthorizedAlways
import platform.CoreLocation.kCLAuthorizationStatusAuthorizedWhenInUse
import platform.CoreLocation.kCLLocationAccuracyHundredMeters
import platform.Foundation.NSError
import platform.darwin.NSObject
import kotlin.coroutines.resume

/**
 * `CLLocationManager.requestLocation()` on the main thread (CoreLocation calls back on the creating thread's run
 * loop). A cached fix answers at once. The old code only read `manager.location` on a fresh manager, which
 * is nil until a request ran, so "nearest" never got coordinates on iOS.
 */
@OptIn(ExperimentalForeignApi::class)
class DeviceLocationProviderIOS : DeviceLocationProvider {
    private val manager by lazy { CLLocationManager().apply { desiredAccuracy = kCLLocationAccuracyHundredMeters } }

    // CoreLocation keeps its delegate weakly.
    private var delegate: FixDelegate? = null

    override suspend fun currentLocation(): LocationData? = withContext(Dispatchers.Main) {
        val status = manager.authorizationStatus
        if (status != kCLAuthorizationStatusAuthorizedWhenInUse && status != kCLAuthorizationStatusAuthorizedAlways) {
            return@withContext null
        }
        // CUS-106: any cached position answers at once (enough for "places near you"); only no cache waits for a fix.
        manager.location?.let { return@withContext it.toData() }
        suspendCancellableCoroutine { continuation ->
            val fixDelegate = FixDelegate { location ->
                clear()
                if (continuation.isActive) continuation.resume(location?.toData() ?: manager.location?.toData())
            }
            continuation.invokeOnCancellation { clear() }
            delegate = fixDelegate
            manager.delegate = fixDelegate
            manager.requestLocation()
        }
    }

    private fun clear() {
        manager.delegate = null
        delegate = null
    }

    private fun CLLocation.toData(): LocationData =
        coordinate.useContents { LocationData(latitude = latitude, longitude = longitude) }

    private class FixDelegate(private val onFix: (CLLocation?) -> Unit) : NSObject(), CLLocationManagerDelegateProtocol {
        override fun locationManager(manager: CLLocationManager, didUpdateLocations: List<*>) {
            onFix(didUpdateLocations.lastOrNull() as? CLLocation)
        }

        override fun locationManager(manager: CLLocationManager, didFailWithError: NSError) {
            onFix(null)
        }
    }
}

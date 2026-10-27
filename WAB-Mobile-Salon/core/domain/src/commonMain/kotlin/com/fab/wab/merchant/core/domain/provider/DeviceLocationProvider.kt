package com.fab.wab.merchant.core.domain.provider

import com.fab.wab.merchant.core.domain.model.LocationData

/** One fresh position of the device (map picker "Use my location"); null when none could be found. */
interface DeviceLocationProvider {
    /** Asks the platform for one position; the caller holds the location permission and bounds the wait. */
    suspend fun currentLocation(): LocationData?
}

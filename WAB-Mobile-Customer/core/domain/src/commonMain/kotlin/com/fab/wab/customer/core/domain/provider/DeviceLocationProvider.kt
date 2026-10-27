package com.fab.wab.customer.core.domain.provider

import com.fab.wab.customer.core.domain.model.LocationData

/**
 * One current device position for the "nearest" features (PRD S03/S04). The caller has checked the permission and
 * the location service; null when no fix is available. Cancellation (the caller's timeout) stops the request.
 */
interface DeviceLocationProvider {
    suspend fun currentLocation(): LocationData?
}

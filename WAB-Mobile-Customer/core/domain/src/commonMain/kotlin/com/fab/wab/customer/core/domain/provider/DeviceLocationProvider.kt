package com.fab.wab.customer.core.domain.provider

import com.fab.wab.customer.core.domain.model.LocationData

interface DeviceLocationProvider {
    fun fetchCurrentLocation(onResult: (LocationData?) -> Unit)
}
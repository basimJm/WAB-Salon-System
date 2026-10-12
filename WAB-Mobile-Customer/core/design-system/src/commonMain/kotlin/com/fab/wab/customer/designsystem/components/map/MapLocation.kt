package com.fab.wab.customer.designsystem.components.map

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

data class LocationDetails(
    val latitude: Double,
    val longitude: Double,
    val address: String? = null
)

val DefaultLocation = LocationDetails(
    latitude = 31.9454,
    longitude = 35.9284,
    address = "Amman, Jordan"
)

@Composable
expect fun MapLocation(
    modifier: Modifier = Modifier,
    initialLocation: LocationDetails? = null,
    onLocationSelected: (LocationDetails) -> Unit,
    isLocationPermissionGranted: Boolean,
)

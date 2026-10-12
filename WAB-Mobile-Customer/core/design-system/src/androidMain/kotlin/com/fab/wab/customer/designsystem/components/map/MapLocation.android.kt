package com.fab.wab.customer.designsystem.components.map

import android.location.Geocoder
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.rememberCameraPositionState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.Locale

@Composable
actual fun MapLocation(
    modifier: Modifier,
    initialLocation: LocationDetails?,
    onLocationSelected: (LocationDetails) -> Unit,
    isLocationPermissionGranted: Boolean,
) {
    val context = LocalContext.current
    val geocoder = remember { Geocoder(context, Locale.getDefault()) }

    val startLocation = initialLocation ?: DefaultLocation
    val initialLatLng = LatLng(startLocation.latitude, startLocation.longitude)

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(initialLatLng, 15f)
    }

    var markerPosition by remember { mutableStateOf(initialLatLng) }


    LaunchedEffect(markerPosition) {
        withContext(Dispatchers.IO) {
            try {
                val addresses =
                    geocoder.getFromLocation(markerPosition.latitude, markerPosition.longitude, 1)
                val addressName = addresses?.firstOrNull()?.getAddressLine(0) ?: ""
                onLocationSelected(
                    LocationDetails(
                        latitude = markerPosition.latitude,
                        longitude = markerPosition.longitude,
                        address = addressName
                    )
                )
            } catch (e: Exception) {
                onLocationSelected(
                    LocationDetails(
                        latitude = markerPosition.latitude,
                        longitude = markerPosition.longitude,
                        address = null
                    )
                )
            }
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties = MapProperties(isMyLocationEnabled = isLocationPermissionGranted),
            uiSettings = MapUiSettings(myLocationButtonEnabled = true),
            onMapClick = {
                markerPosition = it
            }
        ) {
            Marker(
                state = MarkerState(position = markerPosition),
                draggable = true,
                onInfoWindowClick = {
                    markerPosition = LatLng(it.position.latitude, it.position.longitude)
                }
            )
        }
    }
}

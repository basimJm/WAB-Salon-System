package com.fab.wab.customer.designsystem.components.map

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.interop.UIKitView
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.cValue
import kotlinx.cinterop.useContents
import platform.CoreLocation.CLGeocoder
import platform.CoreLocation.CLLocation
import platform.CoreLocation.CLLocationCoordinate2D
import platform.CoreLocation.CLPlacemark
import platform.MapKit.MKCoordinateRegionMakeWithDistance
import platform.MapKit.MKMapView
import platform.MapKit.MKMapViewDelegateProtocol
import platform.darwin.NSObject

@OptIn(ExperimentalForeignApi::class)
@Composable
actual fun MapLocation(
    modifier: Modifier,
    initialLocation: LocationDetails?,
    onLocationSelected: (LocationDetails) -> Unit,
    isLocationPermissionGranted: Boolean,
) {
    val startLocation = initialLocation ?: DefaultLocation
    val geocoder = remember { CLGeocoder() }

    val delegate = remember {
        object : NSObject(), MKMapViewDelegateProtocol {
            override fun mapView(mapView: MKMapView, regionDidChangeAnimated: Boolean) {
                val center = mapView.centerCoordinate
                center.useContents {
                    val lat = latitude
                    val lng = longitude

                    val location = CLLocation(latitude = lat, longitude = lng)
                    geocoder.reverseGeocodeLocation(location) { placemarks, error ->
                        val placemark = placemarks?.firstOrNull() as? CLPlacemark
                        val addressName = placemark?.let { p ->
                            listOfNotNull(p.name, p.locality, p.country).joinToString(", ")
                        }
                        onLocationSelected(
                            LocationDetails(
                                latitude = lat,
                                longitude = lng,
                                address = addressName
                            )
                        )
                    }
                }
            }
        }
    }

    val mapView = remember {
        MKMapView().apply {
            setShowsUserLocation(isLocationPermissionGranted)
            this.delegate = delegate
        }
    }

    LaunchedEffect(Unit) {
        val center = cValue<CLLocationCoordinate2D> {
            latitude = startLocation.latitude
            longitude = startLocation.longitude
        }
        val region = MKCoordinateRegionMakeWithDistance(center, 1000.0, 1000.0)
        mapView.setRegion(region, animated = false)
    }

    UIKitView(
        factory = { mapView },
        modifier = modifier,
        update = { }
    )
}

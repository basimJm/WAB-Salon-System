package com.fab.wab.merchant.core.data.location

import com.fab.wab.merchant.core.domain.location.ReverseGeocoder
import com.fab.wab.merchant.core.domain.location.addressLineOf
import com.fab.wab.merchant.core.domain.model.LocationData
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine
import platform.CoreLocation.CLGeocoder
import platform.CoreLocation.CLLocation
import platform.CoreLocation.CLPlacemark
import platform.Foundation.NSLocale

private const val ARABIC = "ar"

/** `CLGeocoder` in the app language (no API key). */
class IosReverseGeocoder : ReverseGeocoder {
    override suspend fun addressOf(point: LocationData, language: String): String? = suspendCancellableCoroutine { continuation ->
        val geocoder = CLGeocoder()
        continuation.invokeOnCancellation { geocoder.cancelGeocode() }
        geocoder.reverseGeocodeLocation(
            location = CLLocation(latitude = point.latitude, longitude = point.longitude),
            preferredLocale = NSLocale(localeIdentifier = language),
        ) { placemarks, _ ->
            val placemark = placemarks?.firstOrNull() as? CLPlacemark
            val text = placemark?.let { addressLineOf(listOf(it.thoroughfare, it.subLocality, it.locality), rtl = language == ARABIC) }
            continuation.resume(text)
        }
    }
}

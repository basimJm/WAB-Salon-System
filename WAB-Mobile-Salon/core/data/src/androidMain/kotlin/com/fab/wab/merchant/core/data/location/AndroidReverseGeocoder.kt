package com.fab.wab.merchant.core.data.location

import android.content.Context
import android.location.Address
import android.location.Geocoder
import android.os.Build
import com.fab.wab.merchant.core.domain.location.ReverseGeocoder
import com.fab.wab.merchant.core.domain.location.addressLineOf
import com.fab.wab.merchant.core.domain.model.LocationData
import java.io.IOException
import java.util.Locale
import kotlin.coroutines.resume
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext

private const val ARABIC = "ar"
private const val MAX_RESULTS = 1

/** Platform `Geocoder` (no API key); the async listener on Android 13+, the blocking call on IO before that. */
class AndroidReverseGeocoder(private val context: Context) : ReverseGeocoder {
    override suspend fun addressOf(point: LocationData, language: String): String? {
        if (!Geocoder.isPresent()) return null
        val geocoder = Geocoder(context, Locale.forLanguageTag(language))
        val address = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            suspendCancellableCoroutine { continuation ->
                geocoder.getFromLocation(point.latitude, point.longitude, MAX_RESULTS) { found -> continuation.resume(found.firstOrNull()) }
            }
        } else {
            withContext(Dispatchers.IO) { legacyLookup(geocoder, point) }
        }
        return address?.let { addressLineOf(listOf(it.thoroughfare, it.subLocality, it.locality), rtl = language == ARABIC) }
    }

    @Suppress("DEPRECATION") // the synchronous lookup is the only API before Android 13 (TIRAMISU)
    private fun legacyLookup(geocoder: Geocoder, point: LocationData): Address? = try {
        geocoder.getFromLocation(point.latitude, point.longitude, MAX_RESULTS)?.firstOrNull()
    } catch (ignored: IOException) {
        null
    }
}

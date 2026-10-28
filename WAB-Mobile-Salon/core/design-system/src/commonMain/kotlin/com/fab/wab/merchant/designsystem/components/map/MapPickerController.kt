package com.fab.wab.merchant.designsystem.components.map

import com.fab.wab.merchant.core.domain.location.MapDefaults
import com.fab.wab.merchant.core.domain.location.ReverseGeocoder
import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.core.domain.provider.DeviceLocationProvider
import com.fab.wab.merchant.core.domain.repository.PlacesRepository
import com.fab.wab.merchant.core.ui.permission.AppPermission
import com.fab.wab.merchant.core.ui.permission.PermissionFlow
import com.fab.wab.merchant.core.ui.permission.PermissionOutcome
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.math.abs

/** Platform services behind the map picker (salon profile M13, branch form). */
class MapPickerDependencies(
    val geocoder: ReverseGeocoder,
    val places: PlacesRepository,
    val location: DeviceLocationProvider,
    val permissions: PermissionFlow,
    val language: suspend () -> String,
)

/** Result of "Use my location". */
sealed interface LocateResult {
    data class Found(val point: LocationData) : LocateResult
    data object Denied : LocateResult
    data object Blocked : LocateResult

    /** The device's location services (GPS switch) are off. */
    data object ServicesOff : LocateResult

    /** No position within [LOCATE_TIMEOUT_MS] (indoors, emulator without a fix, no Play services). */
    data object NotFound : LocateResult
}

/** "Use my location" gives up after this long and asks the user to move the map instead of spinning forever. */
const val LOCATE_TIMEOUT_MS = 15_000L

/**
 * Reverse geocoding gives up after this long (MER-079, emulator: the platform geocoder never answered, so "Locating
 * address" spun forever and Confirm stayed disabled).
 */
const val GEOCODE_TIMEOUT_MS = 10_000L

/** Geocoding, place search and the device position for the map picker; the view model owns the state. */
class MapPickerController(private val deps: MapPickerDependencies) {

    fun startPoint(current: LocationData?): LocationData = current ?: LocationData(
        MapDefaults.DEFAULT_LATITUDE,
        MapDefaults.DEFAULT_LONGITUDE,
    )

    fun isSamePoint(a: LocationData, b: LocationData): Boolean =
        abs(a.latitude - b.latitude) < MapDefaults.SAME_POINT_DEGREES && abs(a.longitude - b.longitude) < MapDefaults.SAME_POINT_DEGREES

    /** Null after [GEOCODE_TIMEOUT_MS]: the pin keeps its coordinates and Confirm comes back instead of waiting forever. */
    suspend fun addressOf(point: LocationData): String? =
        withTimeoutOrNull(GEOCODE_TIMEOUT_MS) { deps.geocoder.addressOf(point, deps.language()) }

    suspend fun search(query: String): List<PlaceSuggestionUi> =
        if (query.isBlank()) emptyList() else deps.places.searchPlaces(query.trim()).map {
            PlaceSuggestionUi(it.placeId, it.primaryText, it.secondaryText)
        }

    suspend fun pointOf(placeId: String): LocationData? {
        val place = deps.places.fetchPlaceDetails(placeId) ?: return null
        val lat = place.lat ?: return null
        val lng = place.lng ?: return null
        return LocationData(lat, lng)
    }

    suspend fun locate(): LocateResult = when (deps.permissions.ensure(AppPermission.LOCATION)) {
        PermissionOutcome.Granted -> when {
            !deps.permissions.isLocationServiceEnabled() -> LocateResult.ServicesOff
            else -> withTimeoutOrNull(LOCATE_TIMEOUT_MS) { deps.location.currentLocation() }?.let(LocateResult::Found)
                ?: LocateResult.NotFound
        }
        PermissionOutcome.Denied -> LocateResult.Denied
        PermissionOutcome.BlockedInSettings -> LocateResult.Blocked
    }

    /** The app's page in the system settings (location refused for good). */
    fun openAppSettings() = deps.permissions.openSettings(AppPermission.LOCATION)

    /** The system location switch (Android); the Settings app on iOS, which has no deep link to it. */
    fun openLocationServices() = deps.permissions.openLocationServiceSettings()
}

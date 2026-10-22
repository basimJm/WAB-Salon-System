package com.fab.wab.merchant.feature.salon.presentation.controller.profile

import com.fab.wab.merchant.core.domain.location.MapDefaults
import com.fab.wab.merchant.core.domain.location.ReverseGeocoder
import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.core.domain.provider.DeviceLocationProvider
import com.fab.wab.merchant.core.domain.repository.PlacesRepository
import com.fab.wab.merchant.core.ui.permission.AppPermission
import com.fab.wab.merchant.core.ui.permission.PermissionFlow
import com.fab.wab.merchant.core.ui.permission.PermissionOutcome
import com.fab.wab.merchant.designsystem.components.map.PlaceSuggestionUi
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.math.abs

/** Platform services behind the M13 map picker. */
class ProfileMapDependencies(
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
    data object Unavailable : LocateResult
}

/** Geocoding, place search and the device position for the map picker; the view model owns the state. */
class ProfileMapController(private val deps: ProfileMapDependencies) {

    fun startPoint(current: LocationData?): LocationData = current ?: LocationData(MapDefaults.DEFAULT_LATITUDE, MapDefaults.DEFAULT_LONGITUDE)

    fun isSamePoint(a: LocationData, b: LocationData): Boolean =
        abs(a.latitude - b.latitude) < MapDefaults.SAME_POINT_DEGREES && abs(a.longitude - b.longitude) < MapDefaults.SAME_POINT_DEGREES

    suspend fun addressOf(point: LocationData): String? = deps.geocoder.addressOf(point, deps.language())

    suspend fun search(query: String): List<PlaceSuggestionUi> =
        if (query.isBlank()) emptyList() else deps.places.searchPlaces(query.trim()).map { PlaceSuggestionUi(it.placeId, it.primaryText, it.secondaryText) }

    suspend fun pointOf(placeId: String): LocationData? {
        val place = deps.places.fetchPlaceDetails(placeId) ?: return null
        val lat = place.lat ?: return null
        val lng = place.lng ?: return null
        return LocationData(lat, lng)
    }

    suspend fun locate(): LocateResult = when (deps.permissions.ensure(AppPermission.LOCATION)) {
        PermissionOutcome.Granted -> if (!deps.permissions.isLocationServiceEnabled()) {
            LocateResult.Unavailable
        } else {
            suspendCancellableCoroutine<LocateResult> { continuation ->
                deps.location.fetchCurrentLocation { point -> if (continuation.isActive) continuation.resume(point?.let(LocateResult::Found) ?: LocateResult.Unavailable) }
            }
        }
        PermissionOutcome.Denied -> LocateResult.Denied
        PermissionOutcome.BlockedInSettings -> LocateResult.Blocked
    }
}

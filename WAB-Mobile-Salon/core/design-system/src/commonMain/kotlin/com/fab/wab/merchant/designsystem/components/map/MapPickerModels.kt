package com.fab.wab.merchant.designsystem.components.map

import androidx.compose.runtime.Immutable
import com.fab.wab.merchant.core.domain.model.LocationData

/** One search suggestion under the field (Places autocomplete, resolved to a point by the host). */
@Immutable
data class PlaceSuggestionUi(val id: String, val title: String, val subtitle: String)

/**
 * Map picker state (PRD M13; design 05 Salon `on.map`): [target] = where the camera should be, [address] = reverse
 * geocoded text of the pinned point (null while unknown), [resolving] while geocoding, [locating] while the device
 * location is fetched.
 */
@Immutable
data class MapPickerUi(
    val target: LocationData,
    val address: String? = null,
    val resolving: Boolean = false,
    val locating: Boolean = false,
    val query: String = "",
    val suggestions: List<PlaceSuggestionUi> = emptyList(),
    val error: String? = null,
    val notice: MapNotice? = null,
) {
    val canConfirm: Boolean get() = !resolving && !locating
}

sealed interface MapPickerAction {
    /** The user left the map at [point] (camera idle). */
    data class CenterChanged(val point: LocationData) : MapPickerAction
    data object UseMyLocation : MapPickerAction
    data class QueryChanged(val query: String) : MapPickerAction
    data class SuggestionPicked(val id: String) : MapPickerAction
    data object Confirm : MapPickerAction

    /** The notice's button: try again (denied), settings (blocked), location switch (services off). */
    data object NoticeAction : MapPickerAction
    data object DismissNotice : MapPickerAction
}

/** Why "Use my location" did not move the map; shown above the address card with its way out. */
enum class MapNotice { DENIED, BLOCKED, SERVICES_OFF, NOT_FOUND }

/** Stylized-map drag: degrees moved per pixel (about 1.5 m) so the fallback map can still place a pin. */
const val STYLIZED_DEGREES_PER_PX = 0.000014

/** New point after dragging the stylized map by ([dxPx], [dyPx]): the map follows the finger, the point goes the other way. */
fun panStylized(point: LocationData, dxPx: Float, dyPx: Float): LocationData =
    LocationData(latitude = point.latitude + dyPx * STYLIZED_DEGREES_PER_PX, longitude = point.longitude - dxPx * STYLIZED_DEGREES_PER_PX)

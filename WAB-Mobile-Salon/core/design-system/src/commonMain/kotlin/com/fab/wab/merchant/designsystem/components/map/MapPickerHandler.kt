package com.fab.wab.merchant.designsystem.components.map

import com.fab.wab.merchant.core.domain.model.LocationData
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Search waits for a pause in typing before calling the places service. */
const val PLACE_SEARCH_DEBOUNCE_MS = 400L

/**
 * The map picker reducer shared by the salon profile (M13) and the branch form (MER-062): pin moves re-geocode, typed
 * queries search places, "Use my location" asks first and explains every refusal ([MapNotice]). The owning view
 * model keeps the [MapPickerUi] in its state.
 */
class MapPickerHandler(
    private val controller: MapPickerController,
    private val scope: CoroutineScope,
    private val readMap: () -> MapPickerUi?,
    private val writeMap: (MapPickerUi?) -> Unit,
) {
    private var geocodeJob: Job? = null
    private var searchJob: Job? = null

    fun open(location: LocationData?, address: String) {
        val start = controller.startPoint(location)
        writeMap(MapPickerUi(target = start, address = address.ifBlank { null }))
        if (location == null) resolve(start)
    }

    fun handle(action: MapPickerAction, onConfirm: (LocationData, String?) -> Unit) {
        val map = readMap() ?: return
        when (action) {
            is MapPickerAction.CenterChanged -> if (!controller.isSamePoint(map.target, action.point)) {
                writeMap(map.copy(target = action.point))
                resolve(action.point)
            }
            is MapPickerAction.QueryChanged -> search(map, action.query)
            is MapPickerAction.SuggestionPicked -> scope.launch {
                val point = controller.pointOf(action.id) ?: return@launch
                updateMap { copy(target = point, query = "", suggestions = emptyList()) }
                resolve(point)
            }
            MapPickerAction.UseMyLocation -> locate()
            MapPickerAction.Confirm -> if (map.canConfirm) {
                onConfirm(map.target, map.address)
                writeMap(null)
            }
            MapPickerAction.NoticeAction -> noticeAction(map.notice)
            MapPickerAction.DismissNotice -> writeMap(map.copy(notice = null))
        }
    }

    private fun noticeAction(notice: MapNotice?) {
        updateMap { copy(notice = null) }
        when (notice) {
            MapNotice.DENIED -> locate()
            MapNotice.BLOCKED -> controller.openAppSettings()
            MapNotice.SERVICES_OFF -> controller.openLocationServices()
            MapNotice.NOT_FOUND, null -> Unit
        }
    }

    private fun noticeOf(result: LocateResult): MapNotice? = when (result) {
        is LocateResult.Found -> null
        LocateResult.Denied -> MapNotice.DENIED
        LocateResult.Blocked -> MapNotice.BLOCKED
        LocateResult.ServicesOff -> MapNotice.SERVICES_OFF
        LocateResult.NotFound -> MapNotice.NOT_FOUND
    }

    private fun updateMap(change: MapPickerUi.() -> MapPickerUi) {
        readMap()?.let { writeMap(it.change()) }
    }

    private fun resolve(point: LocationData) {
        geocodeJob?.cancel()
        geocodeJob = scope.launch {
            updateMap { copy(resolving = true) }
            val address = controller.addressOf(point)
            updateMap { copy(resolving = false, address = address) }
        }
    }

    private fun search(map: MapPickerUi, query: String) {
        writeMap(map.copy(query = query))
        searchJob?.cancel()
        searchJob = scope.launch {
            delay(PLACE_SEARCH_DEBOUNCE_MS)
            val suggestions = controller.search(query)
            updateMap { copy(suggestions = suggestions) }
        }
    }

    private fun locate() {
        scope.launch {
            updateMap { copy(locating = true, notice = null) }
            val result = controller.locate()
            updateMap { copy(locating = false, notice = noticeOf(result)) }
            if (result is LocateResult.Found) {
                updateMap { copy(target = result.point) }
                resolve(result.point)
            }
        }
    }
}

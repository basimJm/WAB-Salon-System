package com.fab.wab.merchant.feature.salon.presentation.controller.profile

import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.designsystem.components.map.MapPickerAction
import com.fab.wab.merchant.designsystem.components.map.MapPickerUi
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonProfileContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonProfileContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Search waits for a pause in typing before calling the places service. */
internal const val PLACE_SEARCH_DEBOUNCE_MS = 400L

/** The M13 map picker reducer: pin moves re-geocode, typed queries search places, "Use my location" asks first. */
internal class ProfileMapHandler(
    private val controller: ProfileMapController,
    private val scope: CoroutineScope,
    private val state: () -> UiState,
    private val update: (UiState.() -> UiState) -> Unit,
    private val effect: (SideEffect) -> Unit,
) {
    private var geocodeJob: Job? = null
    private var searchJob: Job? = null

    fun open() {
        val form = state().form
        val start = controller.startPoint(form.location)
        update { copy(map = MapPickerUi(target = start, address = form.locationText.ifBlank { null })) }
        if (form.location == null) resolve(start)
    }

    fun handle(action: MapPickerAction, onConfirm: (LocationData, String?) -> Unit) {
        val map = state().map ?: return
        when (action) {
            is MapPickerAction.CenterChanged -> if (!controller.isSamePoint(map.target, action.point)) {
                update { copy(map = map.copy(target = action.point)) }
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
                update { copy(map = null) }
            }
        }
    }

    private fun updateMap(change: MapPickerUi.() -> MapPickerUi) = update { copy(map = map?.change()) }

    private fun resolve(point: LocationData) {
        geocodeJob?.cancel()
        geocodeJob = scope.launch {
            updateMap { copy(resolving = true) }
            val address = controller.addressOf(point)
            updateMap { copy(resolving = false, address = address) }
        }
    }

    private fun search(map: MapPickerUi, query: String) {
        update { copy(map = map.copy(query = query)) }
        searchJob?.cancel()
        searchJob = scope.launch {
            delay(PLACE_SEARCH_DEBOUNCE_MS)
            val suggestions = controller.search(query)
            updateMap { copy(suggestions = suggestions) }
        }
    }

    private fun locate() {
        scope.launch {
            updateMap { copy(locating = true) }
            val result = controller.locate()
            updateMap { copy(locating = false) }
            when (result) {
                is LocateResult.Found -> {
                    updateMap { copy(target = result.point) }
                    resolve(result.point)
                }
                LocateResult.Blocked -> effect(SideEffect.LocationBlocked)
                LocateResult.Denied, LocateResult.Unavailable -> Unit
            }
        }
    }
}

package com.fab.wab.merchant.feature.branches.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.branch.Branch
import com.fab.wab.merchant.core.domain.branch.BranchForm
import com.fab.wab.merchant.core.domain.branch.BranchLimits
import com.fab.wab.merchant.core.domain.branch.BranchesRepository
import com.fab.wab.merchant.core.domain.branch.toForm
import com.fab.wab.merchant.core.domain.locations.LocationDefaults
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.designsystem.components.map.MapPickerController
import com.fab.wab.merchant.designsystem.components.map.MapPickerHandler
import com.fab.wab.merchant.designsystem.components.map.MapPickerUi
import com.fab.wab.merchant.feature.branches.presentation.analytics.BranchesAnalytics
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchEditContract.SideEffect
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchEditContract.UiAction
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchEditContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

class BranchEditDependencies(
    val branches: BranchesRepository,
    val locations: LocationsRepository,
    val map: MapPickerController,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/**
 * Create or edit a branch (MER-062): name in Arabic and English, map location + address, city / area, phone and
 * optional WhatsApp. New branches start ACTIVE and incomplete until their hours, services and staff exist.
 */
class BranchEditViewModel(
    branchId: String?,
    private val deps: BranchEditDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(branchId = branchId, loading = branchId != null), testScope) {

    private val mapHandler = MapPickerHandler(deps.map, scope, ::readMap, ::writeMap)

    override fun onStart() {
        load()
    }

    override fun handle(event: UiAction) {
        handleForm(event) || handleOther(event)
    }

    private fun handleForm(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnNameAr -> edit { copy(nameAr = event.value.take(BranchLimits.NAME_MAX)) }
            is UiAction.OnNameEn -> edit { copy(nameEn = event.value.take(BranchLimits.NAME_MAX)) }
            is UiAction.OnLocationText -> edit { copy(locationText = event.value.take(BranchLimits.LOCATION_TEXT_MAX)) }
            is UiAction.OnCity -> selectCity(event.index)
            is UiAction.OnArea -> uiState.value.areas.getOrNull(event.index)?.let { area -> edit { copy(areaId = area.id) } }
            is UiAction.OnPhone -> edit { copy(phone = event.value) }
            is UiAction.OnWhatsapp -> edit { copy(whatsapp = event.value) }
            else -> return false
        }
        return true
    }

    private fun handleOther(event: UiAction): Boolean {
        when (event) {
            UiAction.OnOpenMap -> uiState.value.form.let { mapHandler.open(it.location, it.locationText) }
            is UiAction.OnMap -> mapHandler.handle(event.action, onConfirm = { point, address ->
                edit { copy(location = point, locationText = address?.take(BranchLimits.LOCATION_TEXT_MAX) ?: locationText) }
            })
            UiAction.OnCloseMap -> writeMap(null)
            UiAction.OnSave -> save()
            UiAction.OnRetry -> load()
            else -> return false
        }
        return true
    }

    private fun readMap(): MapPickerUi? = uiState.value.map

    private fun writeMap(map: MapPickerUi?) = updateState { copy(map = map) }

    private fun edit(change: BranchForm.() -> BranchForm) = updateState { copy(form = form.change()) }

    private fun load() {
        val id = uiState.value.branchId
        scope.launch {
            if (id != null) {
                updateState { copy(loading = true, error = null) }
                val branch = find(id) ?: return@launch
                val form = branch.toForm()
                updateState { copy(loading = false, original = form, form = form) }
            }
            loadCities(uiState.value.form.cityId)
        }
    }

    /** The shared list first; a reload when the branch is not in it (deep entry, process restart). */
    private suspend fun find(id: String): Branch? {
        deps.branches.branches.value.firstOrNull { it.id == id }?.let { return it }
        val error = when (val result = deps.branches.refresh()) {
            is AppResult.Success -> result.data.firstOrNull { it.id == id }?.let { return it } ?: NOT_FOUND
            is AppResult.Error -> result.appError
            AppResult.Loading -> return null
        }
        val message = deps.errorText(error)
        updateState { copy(loading = false, error = message) }
        return null
    }

    private companion object {
        const val NOT_FOUND_STATUS = 404
        val NOT_FOUND = AppError.ServerError(ErrorCode.BRANCH_NOT_FOUND, NOT_FOUND_STATUS, message = null)
    }

    private suspend fun loadCities(cityId: String?) {
        (deps.locations.cities(LocationDefaults.DEFAULT_COUNTRY_CODE) as? AppResult.Success)?.let { updateState { copy(cities = it.data) } }
        if (cityId != null) (deps.locations.areas(cityId) as? AppResult.Success)?.let { updateState { copy(areas = it.data) } }
    }

    private fun selectCity(index: Int) {
        val city = uiState.value.cities.getOrNull(index) ?: return
        if (city.id == uiState.value.form.cityId) return
        edit { copy(cityId = city.id, areaId = null) }
        updateState { copy(areas = emptyList()) }
        scope.launch { (deps.locations.areas(city.id) as? AppResult.Success)?.let { updateState { copy(areas = it.data) } } }
    }

    private fun save() {
        val state = uiState.value
        if (!state.canSave) return
        if (state.errors.isNotEmpty()) {
            updateState { copy(showErrors = true) }
            return
        }
        scope.launch {
            updateState { copy(saving = true) }
            val id = state.branchId
            val result = if (id == null) deps.branches.create(state.form) else deps.branches.update(id, state.form)
            updateState { copy(saving = false) }
            when (result) {
                is AppResult.Success -> {
                    deps.analytics.trackAction(
                        AnalyticsAction(
                            BranchesAnalytics.ACTION_BRANCH_SAVE,
                            analyticsParams { flag(BranchesAnalytics.PARAM_NEW, id == null) },
                        ),
                    )
                    val form = result.data.toForm()
                    updateState { copy(branchId = result.data.id, original = form, form = form, showErrors = false) }
                    emitSideEffect(SideEffect.Saved(created = id == null))
                }
                is AppResult.Error -> emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                AppResult.Loading -> Unit
            }
        }
    }
}

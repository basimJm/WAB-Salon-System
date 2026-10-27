package com.fab.wab.merchant.feature.branches.presentation.controller.contract

import com.fab.wab.merchant.core.domain.branch.BranchField
import com.fab.wab.merchant.core.domain.branch.BranchForm
import com.fab.wab.merchant.core.domain.branch.branchFormErrors
import com.fab.wab.merchant.core.domain.locations.Area
import com.fab.wab.merchant.core.domain.locations.City
import com.fab.wab.merchant.designsystem.components.map.MapPickerAction
import com.fab.wab.merchant.designsystem.components.map.MapPickerUi

sealed interface BranchEditContract {
    data class UiState(
        val branchId: String? = null,
        val loading: Boolean = false,
        val error: String? = null,
        val original: BranchForm = BranchForm(),
        val form: BranchForm = BranchForm(),
        val showErrors: Boolean = false,
        val cities: List<City> = emptyList(),
        val areas: List<Area> = emptyList(),
        val map: MapPickerUi? = null,
        val saving: Boolean = false,
    ) {
        val isNew: Boolean get() = branchId == null
        val errors: Set<BranchField> get() = branchFormErrors(form)
        val visibleErrors: Set<BranchField> get() = if (showErrors) errors else emptySet()
        val canSave: Boolean get() = !saving && (isNew || form != original)
    }

    sealed interface UiAction {
        data class OnNameAr(val value: String) : UiAction
        data class OnNameEn(val value: String) : UiAction
        data class OnLocationText(val value: String) : UiAction
        data class OnCity(val index: Int) : UiAction
        data class OnArea(val index: Int) : UiAction
        data class OnPhone(val value: String) : UiAction
        data class OnWhatsapp(val value: String) : UiAction
        data object OnOpenMap : UiAction
        data class OnMap(val action: MapPickerAction) : UiAction
        data object OnCloseMap : UiAction
        data object OnSave : UiAction
        data object OnRetry : UiAction
    }

    sealed interface SideEffect {
        data class Saved(val created: Boolean) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}

package com.fab.wab.merchant.feature.salon.presentation.controller.contract

import com.fab.wab.merchant.designsystem.components.upload.UploadItemUi
import com.fab.wab.merchant.feature.salon.domain.CatalogRequest
import com.fab.wab.merchant.feature.salon.domain.catalogRequestValid

/** "Request a service" sheet; [image] is the optional picture (uploaded as `CATALOG_IMAGE`). */
data class CatalogRequestForm(val name: String = "", val description: String = "", val image: UploadItemUi? = null, val imageKey: String? = null) {
    val valid: Boolean get() = catalogRequestValid(name, description)
}

sealed interface CatalogRequestsContract {
    data class UiState(
        val loading: Boolean = true,
        val error: String? = null,
        val requests: List<CatalogRequest> = emptyList(),
        val form: CatalogRequestForm? = null,
        val sending: Boolean = false,
    )

    sealed interface UiAction {
        data object OnNew : UiAction
        data class OnName(val value: String) : UiAction
        data class OnDescription(val value: String) : UiAction
        data object OnPickImage : UiAction
        data object OnSend : UiAction
        data object OnDismiss : UiAction
        data object OnRetry : UiAction
    }

    sealed interface SideEffect {
        data object Sent : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}

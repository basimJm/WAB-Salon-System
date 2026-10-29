package com.fab.wab.merchant.feature.salon.presentation.controller.contract

import com.fab.wab.merchant.core.domain.upload.UploadRejection
import com.fab.wab.merchant.designsystem.components.upload.MediaPickAction
import com.fab.wab.merchant.designsystem.components.upload.MediaPickUi
import com.fab.wab.merchant.designsystem.components.upload.UploadItemUi
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.feature.salon.domain.ServiceDraft
import com.fab.wab.merchant.feature.salon.domain.ServiceField
import com.fab.wab.merchant.feature.salon.domain.serviceErrors

sealed interface ServiceEditContract {
    /** [isNew] = adding [title] from the catalog; [currentMedia] = media already on the service (urls). */
    data class UiState(
        val loading: Boolean = true,
        val error: String? = null,
        val isNew: Boolean = false,
        val title: String = "",
        val imageUrl: String = "",
        val brideAllowed: Boolean = false,
        val original: ServiceDraft = ServiceDraft(),
        val draft: ServiceDraft = ServiceDraft(),
        val currentMedia: List<String> = emptyList(),
        val uploads: List<UploadItemUi> = emptyList(),
        val showErrors: Boolean = false,
        val saving: Boolean = false,
        val confirmDeactivate: Boolean = false,
        val rejection: UploadRejection? = null,
        val media: MediaPickUi = MediaPickUi(),
    ) {
        val errors: Set<ServiceField> get() = serviceErrors(draft)
        val visibleErrors: Set<ServiceField> get() = if (showErrors) errors else emptySet()
        val uploading: Boolean get() = uploads.any { it.status is UploadStatus.Uploading }
        val canSave: Boolean get() = (isNew || draft != original) && !saving && !uploading
    }

    sealed interface UiAction {
        data class OnPrice(val value: String) : UiAction
        data class OnDuration(val value: String) : UiAction
        data class OnBrideOnly(val value: Boolean) : UiAction
        data class OnDescription(val value: String) : UiAction
        data class OnActive(val value: Boolean) : UiAction
        data object OnAddMedia : UiAction
        data class OnMedia(val action: MediaPickAction) : UiAction
        data class OnRetryMedia(val id: String) : UiAction
        data class OnRemoveMedia(val id: String) : UiAction
        data object OnSave : UiAction
        data object OnConfirmDeactivate : UiAction
        data object OnDismiss : UiAction
        data object OnRetry : UiAction
    }

    sealed interface SideEffect {
        data object Saved : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}

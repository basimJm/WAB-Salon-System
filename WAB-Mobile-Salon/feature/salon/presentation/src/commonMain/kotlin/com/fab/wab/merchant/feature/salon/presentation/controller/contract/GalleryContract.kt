package com.fab.wab.merchant.feature.salon.presentation.controller.contract

import com.fab.wab.merchant.core.domain.upload.LocalFile
import com.fab.wab.merchant.core.domain.upload.UploadRejection
import com.fab.wab.merchant.designsystem.components.upload.MediaGridMode
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.feature.salon.domain.GalleryItem
import com.fab.wab.merchant.feature.salon.domain.GalleryType

/** A picked file on its way to the gallery (upload → `POST /salon/gallery`); kept for retry. */
class PendingMedia(val id: String, val file: LocalFile, val type: GalleryType, val status: UploadStatus)

sealed interface GalleryContract {
    data class UiState(
        val loading: Boolean = true,
        val error: String? = null,
        val items: List<GalleryItem> = emptyList(),
        val pending: List<PendingMedia> = emptyList(),
        val mode: MediaGridMode = MediaGridMode.Normal,
        val selected: Set<String> = emptySet(),
        val deleteDialog: Boolean = false,
        val busy: Boolean = false,
        val rejection: UploadRejection? = null,
        val viewerIndex: Int? = null,
    ) {
        val isEmpty: Boolean get() = !loading && error == null && items.isEmpty() && pending.isEmpty()
    }

    sealed interface UiAction {
        data object OnAdd : UiAction
        data class OnItemClick(val id: String) : UiAction
        data class OnRetryItem(val id: String) : UiAction
        data class OnMove(val from: Int, val to: Int) : UiAction
        data class OnMode(val mode: MediaGridMode) : UiAction
        data object OnDone : UiAction
        data object OnDeleteClick : UiAction
        data object OnDeleteConfirm : UiAction
        data object OnDialogDismiss : UiAction
        data object OnCloseViewer : UiAction
        data object OnRetry : UiAction
    }

    sealed interface SideEffect {
        data object Deleted : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}

package com.fab.wab.merchant.feature.salon.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.upload.LocalFile
import com.fab.wab.merchant.core.domain.upload.UploadFileUseCase
import com.fab.wab.merchant.core.domain.upload.UploadKind
import com.fab.wab.merchant.core.domain.upload.UploadProgress
import com.fab.wab.merchant.core.domain.upload.UploadPurpose
import com.fab.wab.merchant.core.domain.upload.UploadSlot
import com.fab.wab.merchant.core.domain.upload.validateUpload
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.core.ui.media.FilePicker
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.designsystem.components.upload.LocalPreview
import com.fab.wab.merchant.designsystem.components.upload.UploadItemUi
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.feature.salon.domain.CatalogRequestLimits
import com.fab.wab.merchant.feature.salon.domain.CatalogRequestsRepository
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.CatalogRequestForm
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.CatalogRequestsContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.CatalogRequestsContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.CatalogRequestsContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

private const val FIRST_PAGE = 1
private const val IMAGE_ID = "catalog-request-image"

/** PRD M16 catalog requests: list with status + admin note, "Request a service" form (name, description, picture). */
class CatalogRequestsViewModel(
    private val repository: CatalogRequestsRepository,
    private val picker: FilePicker,
    private val upload: UploadFileUseCase,
    private val analytics: AnalyticsTracker,
    private val errorText: suspend (AppError) -> String = ::appErrorText,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    override fun onStart() {
        load()
    }

    override fun handle(event: UiAction) {
        when (event) {
            UiAction.OnNew -> updateState { copy(form = CatalogRequestForm()) }
            is UiAction.OnName -> editForm { copy(name = event.value.take(CatalogRequestLimits.NAME_MAX)) }
            is UiAction.OnDescription -> editForm { copy(description = event.value.take(CatalogRequestLimits.DESCRIPTION_MAX)) }
            UiAction.OnPickImage -> pickImage()
            UiAction.OnSend -> send()
            UiAction.OnDismiss -> updateState { copy(form = null) }
            UiAction.OnRetry -> load()
        }
    }

    private fun editForm(change: CatalogRequestForm.() -> CatalogRequestForm) = updateState { copy(form = form?.change()) }

    private fun load() {
        scope.launch {
            updateState { copy(loading = true, error = null) }
            when (val result = repository.list(FIRST_PAGE)) {
                is AppResult.Success -> updateState { copy(loading = false, requests = result.data) }
                is AppResult.Error -> {
                    val message = errorText(result.appError)
                    updateState { copy(loading = false, error = message) }
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun pickImage() {
        scope.launch {
            val picked = picker.pickMedia(maxCount = 1, includeVideo = false).firstOrNull() ?: return@launch
            val file = LocalFile(IMAGE_ID, picked.name, picked.bytes, picked.contentType)
            if (validateUpload(file, UploadSlot.IMAGE) != null) return@launch
            upload(file, UploadPurpose.CATALOG_IMAGE).collect { progress ->
                val status = when (progress) {
                    is UploadProgress.Uploading -> UploadStatus.Uploading(progress.fraction)
                    is UploadProgress.Done -> UploadStatus.Uploaded
                    is UploadProgress.Failed -> UploadStatus.Failed
                }
                val item = UploadItemUi(IMAGE_ID, file.name, UploadKind.IMAGE, status, preview = LocalPreview(file.bytes))
                editForm { copy(image = item, imageKey = (progress as? UploadProgress.Done)?.upload?.key ?: imageKey) }
                if (progress is UploadProgress.Failed) emitSideEffect(SideEffect.ShowError(errorText(progress.error)))
            }
        }
    }

    private fun send() {
        val form = uiState.value.form ?: return
        if (!form.valid || uiState.value.sending || form.image?.status is UploadStatus.Uploading) return
        scope.launch {
            updateState { copy(sending = true) }
            val result = repository.create(form.name, form.description, form.imageKey)
            updateState { copy(sending = false) }
            when (result) {
                is AppResult.Success -> {
                    analytics.trackAction(AnalyticsAction(SalonAnalytics.ACTION_CATALOG_REQUEST))
                    updateState { copy(form = null, requests = listOf(result.data) + requests) }
                    emitSideEffect(SideEffect.Sent)
                }
                is AppResult.Error -> emitSideEffect(SideEffect.ShowError(errorText(result.appError)))
                AppResult.Loading -> Unit
            }
        }
    }
}

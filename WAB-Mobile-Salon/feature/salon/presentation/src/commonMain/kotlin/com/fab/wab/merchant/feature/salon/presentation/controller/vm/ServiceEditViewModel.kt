package com.fab.wab.merchant.feature.salon.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.core.domain.salon.SalonGenderType
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.domain.upload.LocalFile
import com.fab.wab.merchant.core.domain.upload.UploadFileUseCase
import com.fab.wab.merchant.core.domain.upload.UploadKind
import com.fab.wab.merchant.core.domain.upload.UploadProgress
import com.fab.wab.merchant.core.domain.upload.UploadPurpose
import com.fab.wab.merchant.core.domain.upload.UploadSlot
import com.fab.wab.merchant.core.domain.upload.acceptUploads
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.core.ui.media.FilePicker
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.designsystem.components.upload.LocalPreview
import com.fab.wab.merchant.designsystem.components.upload.UploadItemUi
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.feature.salon.domain.ServiceDraft
import com.fab.wab.merchant.feature.salon.domain.ServiceLimits
import com.fab.wab.merchant.feature.salon.domain.ServicesRepository
import com.fab.wab.merchant.feature.salon.domain.toDraft
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ServiceEditContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ServiceEditContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ServiceEditContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.launch

private const val MEDIA_PREFIX = "media-"
private const val NOT_FOUND_STATUS = 404

class ServiceEditDependencies(
    val services: ServicesRepository,
    val salon: SalonRepository,
    val picker: FilePicker,
    val upload: UploadFileUseCase,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
    /** MER-064: the branch the services list is editing (owner switcher); null scope = the member's own branch. */
    val branchScope: Flow<BranchScope> = flowOf(BranchScope()),
)

/** PRD M16 form: add [catalogServiceId] or edit [serviceId]; price / duration / bride-only (women) / description / media / active. */
class ServiceEditViewModel(
    private val serviceId: String?,
    private val catalogServiceId: String?,
    private val deps: ServiceEditDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private val files = mutableMapOf<String, LocalFile>()
    private val keys = mutableMapOf<String, String>()
    private var nextFile = 0

    override fun onStart() {
        load()
    }

    override fun handle(event: UiAction) {
        handleForm(event) || handleActions(event)
    }

    private fun handleForm(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnPrice -> edit { copy(price = event.value) }
            is UiAction.OnDuration -> edit { copy(durationMinutes = event.value) }
            is UiAction.OnBrideOnly -> if (uiState.value.womenSalon) edit { copy(brideOnly = event.value) }
            is UiAction.OnDescription -> edit { copy(description = event.value.take(ServiceLimits.DESCRIPTION_MAX)) }
            is UiAction.OnActive -> edit { copy(active = event.value) }
            UiAction.OnAddMedia -> addMedia()
            is UiAction.OnRetryMedia -> files[event.id]?.let { file -> scope.launch { send(file) } }
            is UiAction.OnRemoveMedia -> {
                files.remove(event.id)
                keys.remove(event.id)
                updateState { copy(uploads = uploads.filterNot { it.id == event.id }) }
                edit { copy(mediaKeys = uiState.value.uploads.mapNotNull { keys[it.id] }.takeIf { uiState.value.uploads.isNotEmpty() }) }
            }
            else -> return false
        }
        return true
    }

    private fun handleActions(event: UiAction): Boolean {
        when (event) {
            UiAction.OnSave -> save(confirmed = false)
            UiAction.OnConfirmDeactivate -> {
                updateState { copy(confirmDeactivate = false) }
                save(confirmed = true)
            }
            UiAction.OnDismiss -> updateState { copy(confirmDeactivate = false, rejection = null) }
            UiAction.OnRetry -> load()
            else -> return false
        }
        return true
    }

    private fun edit(change: ServiceDraft.() -> ServiceDraft) = updateState { copy(draft = draft.change()) }

    private suspend fun branchId(): String? = deps.branchScope.first().edited

    private fun load() {
        scope.launch {
            updateState { copy(loading = true, error = null) }
            val women = (deps.salon.current.value ?: (deps.salon.refresh() as? AppResult.Success)?.data)?.gender == SalonGenderType.FEMALE
            val id = serviceId
            if (id != null) {
                val service = deps.services.cachedService(id)
                    ?: (deps.services.services(branchId()) as? AppResult.Success)?.data?.firstOrNull { it.id == id }
                if (service == null) return@launch notFound()
                val draft = service.toDraft()
                updateState {
                    copy(
                        loading = false,
                        isNew = false,
                        title = service.name,
                        imageUrl = service.imageUrl,
                        womenSalon = women,
                        original = draft,
                        draft = draft,
                        currentMedia = service.mediaUrls,
                    )
                }
            } else {
                val catalog = catalogServiceId?.let(deps.services::cachedCatalog) ?: return@launch notFound()
                updateState { copy(loading = false, isNew = true, title = catalog.name, imageUrl = catalog.imageUrl, womenSalon = women) }
            }
        }
    }

    private suspend fun notFound() {
        val message = deps.errorText(AppError.ServerError(ErrorCode.NOT_FOUND, NOT_FOUND_STATUS, null))
        updateState { copy(loading = false, error = message) }
    }

    private fun addMedia() {
        scope.launch {
            val state = uiState.value
            val free = ServiceLimits.MEDIA_MAX - state.uploads.size
            if (free <= 0) return@launch
            val picked = deps.picker.pickMedia(maxCount = free, includeVideo = true).map { file ->
                LocalFile(MEDIA_PREFIX + nextFile++, file.name, file.bytes, file.contentType, file.durationMs)
            }
            val (accepted, refused) = acceptUploads(picked, UploadSlot.MEDIA, free)
            updateState { copy(rejection = refused.firstOrNull()) }
            accepted.forEach { file ->
                files[file.id] = file
                send(file)
            }
        }
    }

    private suspend fun send(file: LocalFile) {
        deps.upload(file, UploadPurpose.SERVICE_MEDIA).collect { progress ->
            val status = when (progress) {
                is UploadProgress.Uploading -> UploadStatus.Uploading(progress.fraction)
                is UploadProgress.Done -> UploadStatus.Uploaded
                is UploadProgress.Failed -> UploadStatus.Failed
            }
            val preview = if (file.kind == UploadKind.IMAGE) LocalPreview(file.bytes) else null
            val item = UploadItemUi(file.id, file.name, file.kind, status, preview = preview, durationMs = file.durationMs)
            updateState {
                copy(uploads = if (uploads.any { it.id == file.id }) uploads.map { if (it.id == file.id) item else it } else uploads + item)
            }
            when (progress) {
                is UploadProgress.Done -> {
                    keys[file.id] = progress.upload.key
                    edit { copy(mediaKeys = uiState.value.uploads.mapNotNull { keys[it.id] }) }
                }
                is UploadProgress.Failed -> emitSideEffect(SideEffect.ShowError(deps.errorText(progress.error)))
                is UploadProgress.Uploading -> Unit
            }
        }
    }

    private fun save(confirmed: Boolean) {
        val state = uiState.value
        if (!state.canSave) return
        if (state.errors.isNotEmpty()) {
            updateState { copy(showErrors = true) }
            return
        }
        val deactivating = !state.isNew && state.original.active && !state.draft.active
        if (!confirmed && deactivating) {
            updateState { copy(confirmDeactivate = true) }
            return
        }
        scope.launch {
            updateState { copy(saving = true) }
            val id = serviceId
            val catalog = catalogServiceId
            val branchId = branchId()
            val result = when {
                id != null -> deps.services.update(id, state.draft, branchId)
                catalog != null -> deps.services.create(catalog, state.draft, branchId)
                else -> return@launch
            }
            updateState { copy(saving = false) }
            when (result) {
                is AppResult.Success -> {
                    deps.analytics.trackAction(AnalyticsAction(
                        SalonAnalytics.ACTION_SERVICE_SAVE,
                        analyticsParams { text(SalonAnalytics.PARAM_NEW, state.isNew.toString()) },
                    ))
                    emitSideEffect(SideEffect.Saved)
                }
                is AppResult.Error -> emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                AppResult.Loading -> Unit
            }
        }
    }
}

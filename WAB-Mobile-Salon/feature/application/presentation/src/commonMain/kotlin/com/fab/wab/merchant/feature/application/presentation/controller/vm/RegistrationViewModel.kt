package com.fab.wab.merchant.feature.application.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.locations.LocationDefaults
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.core.domain.upload.UploadFileUseCase
import com.fab.wab.merchant.core.domain.upload.UploadLimits
import com.fab.wab.merchant.core.domain.upload.UploadPurpose
import com.fab.wab.merchant.core.domain.upload.UploadSlot
import com.fab.wab.merchant.core.domain.upload.acceptUploads
import com.fab.wab.merchant.core.domain.upload.remainingSlots
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.core.ui.media.FilePicker
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.feature.application.domain.model.RegistrationInput
import com.fab.wab.merchant.feature.application.domain.model.registrationErrors
import com.fab.wab.merchant.feature.application.domain.model.toForm
import com.fab.wab.merchant.feature.application.domain.usecase.ResubmitApplicationUseCase
import com.fab.wab.merchant.feature.application.domain.usecase.SubmitApplicationUseCase
import com.fab.wab.merchant.feature.application.presentation.analytics.ApplicationAnalytics
import com.fab.wab.merchant.feature.application.presentation.controller.contract.ApplicationSlugs
import com.fab.wab.merchant.feature.application.presentation.controller.contract.RegistrationContract.SideEffect
import com.fab.wab.merchant.feature.application.presentation.controller.contract.RegistrationContract.UiAction
import com.fab.wab.merchant.feature.application.presentation.controller.contract.RegistrationContract.UiState
import com.fab.wab.merchant.feature.application.presentation.controller.contract.RegistrationMode
import com.fab.wab.merchant.feature.auth.domain.model.OtpVerified
import com.fab.wab.merchant.feature.auth.domain.repository.PendingOtpVerification
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

class RegistrationDependencies(
    val submit: SubmitApplicationUseCase,
    val resubmit: ResubmitApplicationUseCase,
    val locations: LocationsRepository,
    val filePicker: FilePicker,
    val uploadFile: UploadFileUseCase,
    val pending: PendingOtpVerification,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** PRD M04 salon registration (and the resubmission of a rejected application, PRD M05). */
class RegistrationViewModel(
    mode: RegistrationMode,
    private val deps: RegistrationDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(mode = mode), testScope) {

    private val proof: OtpVerified? = if (mode == RegistrationMode.NEW) deps.pending.consume() else null
    private var uploads: List<DocumentUpload> = emptyList()
    private var nextFileId = 0

    override fun onStart() {
        if (uiState.value.mode == RegistrationMode.NEW && proof == null) {
            emitSideEffect(SideEffect.NavigateToLogin)
            return
        }
        if (uiState.value.mode == RegistrationMode.NEW) loadCities()
        revalidate()
    }

    override fun handle(event: UiAction) {
        handleForm(event) || handleDocuments(event)
    }

    private fun handleForm(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnSalonNameChange -> edit { copy(salonName = event.value) }
            is UiAction.OnGenderSelect -> edit { copy(gender = event.gender) }
            is UiAction.OnFirstNameChange -> edit { copy(firstName = event.value) }
            is UiAction.OnLastNameChange -> edit { copy(lastName = event.value) }
            is UiAction.OnCitySelect -> selectCity(event.index)
            is UiAction.OnAreaSelect -> uiState.value.areas.getOrNull(event.index)?.let { area -> edit { copy(areaId = area.id) } }
            else -> return false
        }
        return true
    }

    private fun handleDocuments(event: UiAction): Boolean {
        when (event) {
            UiAction.OnAddDocuments -> scope.launch { addDocuments() }
            is UiAction.OnRemoveDocument -> setUploads(uploads.filterNot { it.file.id == event.id })
            is UiAction.OnRetryDocument -> uploads.firstOrNull { it.file.id == event.id }?.let { startUpload(it) }
            UiAction.OnTermsToggle -> edit { copy(termsAccepted = !termsAccepted) }
            UiAction.OnTermsClick -> emitSideEffect(SideEffect.OpenContent(ApplicationSlugs.SALON_TERMS))
            UiAction.OnSubmit -> submit()
            else -> return false
        }
        return true
    }

    private fun edit(change: RegistrationInput.() -> RegistrationInput) {
        updateState { copy(input = input.change()) }
        revalidate()
    }

    private fun revalidate() = updateState {
        copy(errors = registrationErrors(input, resubmission = isResubmission), documents = uploads)
    }

    private fun setUploads(next: List<DocumentUpload>) {
        uploads = next
        edit { copy(documentKeys = next.confirmedKeys, documentsUploading = next.anyUploading) }
    }

    private fun loadCities() {
        val country = proof?.phone?.countryCode ?: LocationDefaults.DEFAULT_COUNTRY_CODE
        scope.launch {
            (deps.locations.cities(country) as? AppResult.Success)?.let { cities -> updateState { copy(cities = cities.data) } }
        }
    }

    private fun selectCity(index: Int) {
        val city = uiState.value.cities.getOrNull(index) ?: return
        edit { copy(cityId = city.id, areaId = null) }
        updateState { copy(areas = emptyList()) }
        scope.launch {
            (deps.locations.areas(city.id) as? AppResult.Success)?.let { areas -> updateState { copy(areas = areas.data) } }
        }
    }

    private suspend fun addDocuments() {
        val remaining = remainingSlots(uploads.size, UploadLimits.DOCUMENT_MAX_FILES)
        if (remaining == 0) return
        val picked = deps.filePicker.pickDocuments(remaining).map { it.toLocalFile(id = (nextFileId++).toString()) }
        val (accepted, refused) = acceptUploads(picked, UploadSlot.DOCUMENTS, remaining)
        updateState { copy(documentRejection = refused.firstOrNull()) }
        accepted.forEach { startUpload(DocumentUpload(it, UploadStatus.Uploading(0f))) }
    }

    private fun startUpload(upload: DocumentUpload) {
        val id = upload.file.id
        setUploads(uploads.filterNot { it.file.id == id } + upload.copy(status = UploadStatus.Uploading(0f)))
        scope.launch {
            deps.uploadFile(
                upload.file,
                UploadPurpose.LICENSE_DOCUMENT,
            ).collect { progress -> setUploads(uploads.withProgress(id, progress)) }
            deps.analytics.trackAction(AnalyticsAction(ApplicationAnalytics.ACTION_DOCUMENT_UPLOAD))
        }
    }

    private fun submit() {
        val current = uiState.value
        updateState { copy(showErrors = true) }
        val form = current.input.toForm(resubmission = current.isResubmission) ?: return
        scope.launch {
            updateState { copy(submitting = true) }
            val result = if (current.isResubmission) {
                deps.resubmit(form)
            } else {
                val verified = proof ?: return@launch emitSideEffect(SideEffect.NavigateToLogin)
                deps.submit(form, verified)
            }
            updateState { copy(submitting = false) }
            track(if (current.isResubmission) ApplicationAnalytics.ACTION_RESUBMIT else ApplicationAnalytics.ACTION_SUBMIT, result)
            when (result) {
                is AppResult.Success -> emitSideEffect(SideEffect.NavigateToStatus)
                is AppResult.Error -> emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                AppResult.Loading -> Unit
            }
        }
    }

    private fun track(name: String, result: AppResult<*>) {
        val outcome = if (result is AppResult.Success) ApplicationAnalytics.RESULT_SUCCESS else ApplicationAnalytics.RESULT_ERROR
        deps.analytics.trackAction(AnalyticsAction(name, analyticsParams { text(ApplicationAnalytics.PARAM_RESULT, outcome) }))
    }
}

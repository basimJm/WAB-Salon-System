package com.fab.wab.merchant.feature.application.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.locations.LocationDefaults
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.core.domain.salon.BusinessKind
import com.fab.wab.merchant.core.domain.salon.BusinessType
import com.fab.wab.merchant.core.domain.upload.UploadFileUseCase
import com.fab.wab.merchant.core.domain.upload.UploadPurpose
import com.fab.wab.merchant.core.domain.upload.UploadRejection
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.core.ui.media.FilePicker
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.designsystem.components.upload.DOCUMENT_SOURCES
import com.fab.wab.merchant.designsystem.components.upload.MediaPickHandler
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
    /** The rejected salon's own type + audience (resubmission; `GET /salon`), null when it cannot be read. */
    val salonKind: suspend () -> BusinessKind? = { null },
)

/** PRD M04 registration of a salon or a clinic (BUSINESS_DOMAIN §5.19) and the resubmission of a rejected one (PRD M05). */
class RegistrationViewModel(
    mode: RegistrationMode,
    private val deps: RegistrationDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(mode = mode), testScope) {

    private val proof: OtpVerified? = if (mode == RegistrationMode.NEW) deps.pending.consume() else null
    private val media = MediaPickHandler(deps.filePicker, scope, { uiState.value.media }) { updateState { copy(media = it) } }
    private val documents = tray(UploadPurpose.LICENSE_DOCUMENT) { list ->
        edit { copy(documentKeys = list.confirmedKeys, documentsUploading = list.anyUploading) }
    }
    private val medical = tray(UploadPurpose.MEDICAL_LICENSE) { list ->
        edit { copy(medicalLicenseKeys = list.confirmedKeys, medicalUploading = list.anyUploading) }
    }
    private var started = false

    private fun tray(purpose: UploadPurpose, onChange: (List<DocumentUpload>) -> Unit) = LicenseTray(
        purpose = purpose,
        scope = scope,
        uploadFile = deps.uploadFile,
        onUploaded = { deps.analytics.trackAction(AnalyticsAction(ApplicationAnalytics.ACTION_DOCUMENT_UPLOAD)) },
        onChange = onChange,
    )

    override fun onStart() {
        if (uiState.value.mode == RegistrationMode.NEW && proof == null) {
            emitSideEffect(SideEffect.NavigateToLogin)
            return
        }
        if (!started) {
            started = true
            if (uiState.value.mode == RegistrationMode.NEW) loadCities() else loadSalonKind()
        }
        revalidate()
    }

    override fun handle(event: UiAction) {
        handleForm(event) || handleDocuments(event) || handleMedical(event)
    }

    private fun handleForm(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnBusinessTypeSelect -> selectType(event.type)
            is UiAction.OnAudienceSelect -> edit { copy(audience = event.audience) }
            is UiAction.OnSalonNameChange -> edit { copy(salonName = event.value) }
            is UiAction.OnFirstNameChange -> edit { copy(firstName = event.value) }
            is UiAction.OnLastNameChange -> edit { copy(lastName = event.value) }
            is UiAction.OnCitySelect -> selectCity(event.index)
            is UiAction.OnAreaSelect -> uiState.value.areas.getOrNull(event.index)?.let { area -> edit { copy(areaId = area.id) } }
            UiAction.OnTermsToggle -> edit { copy(termsAccepted = !termsAccepted) }
            UiAction.OnTermsClick -> emitSideEffect(SideEffect.OpenContent(ApplicationSlugs.SALON_TERMS))
            UiAction.OnSubmit -> submit()
            else -> return false
        }
        return true
    }

    private fun handleDocuments(event: UiAction): Boolean {
        when (event) {
            UiAction.OnAddDocuments -> pick(documents) { copy(documentRejection = it) }
            is UiAction.OnMedia -> media.handle(event.action)
            is UiAction.OnRemoveDocument -> documents.remove(event.id)
            is UiAction.OnRetryDocument -> documents.retry(event.id)
            else -> return false
        }
        return true
    }

    private fun handleMedical(event: UiAction): Boolean {
        when (event) {
            UiAction.OnAddMedicalLicense -> pick(medical) { copy(medicalRejection = it) }
            is UiAction.OnRemoveMedicalLicense -> medical.remove(event.id)
            is UiAction.OnRetryMedicalLicense -> medical.retry(event.id)
            else -> return false
        }
        return true
    }

    /** Clinics and tattoo studios serve everyone (no audience question, §5.19, §5.23); a resubmission's type is fixed. */
    private fun selectType(type: BusinessType) {
        if (uiState.value.typeLocked) return
        edit { copy(businessType = type, audience = if (type != BusinessType.SALON) null else audience) }
    }

    private fun edit(change: RegistrationInput.() -> RegistrationInput) {
        updateState { copy(input = input.change()) }
        revalidate()
    }

    private fun revalidate() = updateState {
        copy(
            errors = registrationErrors(input, resubmission = isResubmission),
            documents = this@RegistrationViewModel.documents.items,
            medicalDocuments = medical.items,
        )
    }

    private fun loadCities() {
        val country = proof?.phone?.countryCode ?: LocationDefaults.DEFAULT_COUNTRY_CODE
        scope.launch {
            (deps.locations.cities(country) as? AppResult.Success)?.let { cities -> updateState { copy(cities = cities.data) } }
        }
    }

    /** A resubmission keeps the salon's type; a salon may still correct its audience while rejected. */
    private fun loadSalonKind() {
        scope.launch {
            val kind = deps.salonKind() ?: return@launch
            updateState { copy(typeLocked = true) }
            edit { copy(businessType = kind.type, audience = kind.audience.takeIf { kind.type == BusinessType.SALON }) }
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

    /** Camera / photo library / files (MER-076 picker) into [target]; [showRejection] stores the first refused file. */
    private fun pick(target: LicenseTray, showRejection: UiState.(UploadRejection?) -> UiState) {
        val remaining = target.remaining
        media.open(DOCUMENT_SOURCES, maxCount = remaining) { files ->
            val refused = target.accept(files, remaining)
            updateState { showRejection(refused) }
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
                is AppResult.Error -> {
                    emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                    // The single-use `otpToken` expired or was spent: only a new REGISTER code can submit.
                    if (!current.isResubmission && result.appError.isRejectedProof()) emitSideEffect(SideEffect.NavigateToLogin)
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun track(name: String, result: AppResult<*>) {
        val outcome = if (result is AppResult.Success) ApplicationAnalytics.RESULT_SUCCESS else ApplicationAnalytics.RESULT_ERROR
        deps.analytics.trackAction(AnalyticsAction(name, analyticsParams { text(ApplicationAnalytics.PARAM_RESULT, outcome) }))
    }
}

private fun AppError.isRejectedProof(): Boolean =
    (this as? AppError.ServerError)?.code.let { it == ErrorCode.OTP_INVALID || it == ErrorCode.OTP_EXPIRED }

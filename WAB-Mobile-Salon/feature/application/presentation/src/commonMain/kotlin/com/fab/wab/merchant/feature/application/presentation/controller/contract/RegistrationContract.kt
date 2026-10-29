package com.fab.wab.merchant.feature.application.presentation.controller.contract

import com.fab.wab.merchant.core.domain.locations.Area
import com.fab.wab.merchant.core.domain.locations.City
import com.fab.wab.merchant.core.domain.salon.Audience
import com.fab.wab.merchant.core.domain.salon.BusinessType
import com.fab.wab.merchant.core.domain.upload.UploadRejection
import com.fab.wab.merchant.designsystem.components.upload.MediaPickAction
import com.fab.wab.merchant.designsystem.components.upload.MediaPickUi
import com.fab.wab.merchant.feature.application.domain.model.RegistrationField
import com.fab.wab.merchant.feature.application.domain.model.RegistrationInput
import com.fab.wab.merchant.feature.application.presentation.controller.vm.DocumentUpload

/** New application (after the REGISTER OTP) or "Edit & resubmit" of a rejected one (PRD M05). */
enum class RegistrationMode { NEW, RESUBMIT }

sealed interface RegistrationContract {
    /**
     * PRD M04 + BUSINESS_DOMAIN §5.19: the business type comes first (salon → audience; clinic → medical license); submit
     * stays off until valid; field errors show once the user tried to submit. [typeLocked] = a resubmission, whose type
     * is the salon's own and never changes.
     */
    data class UiState(
        val mode: RegistrationMode = RegistrationMode.NEW,
        val input: RegistrationInput = RegistrationInput(),
        val cities: List<City> = emptyList(),
        val areas: List<Area> = emptyList(),
        val documents: List<DocumentUpload> = emptyList(),
        val documentRejection: UploadRejection? = null,
        val medicalDocuments: List<DocumentUpload> = emptyList(),
        val medicalRejection: UploadRejection? = null,
        val typeLocked: Boolean = false,
        val media: MediaPickUi = MediaPickUi(),
        val errors: Set<RegistrationField> = emptySet(),
        val showErrors: Boolean = false,
        val submitting: Boolean = false,
    ) {
        val isResubmission: Boolean get() = mode == RegistrationMode.RESUBMIT
        val canSubmit: Boolean get() = errors.isEmpty() && !submitting
        val isClinic: Boolean get() = input.businessType == BusinessType.CLINIC
        fun errorOf(field: RegistrationField): Boolean = showErrors && field in errors
    }

    sealed interface UiAction {
        data class OnSalonNameChange(val value: String) : UiAction
        data class OnBusinessTypeSelect(val type: BusinessType) : UiAction
        data class OnAudienceSelect(val audience: Audience) : UiAction
        data class OnFirstNameChange(val value: String) : UiAction
        data class OnLastNameChange(val value: String) : UiAction
        data class OnCitySelect(val index: Int) : UiAction
        data class OnAreaSelect(val index: Int) : UiAction
        data object OnAddDocuments : UiAction
        data class OnMedia(val action: MediaPickAction) : UiAction
        data class OnRemoveDocument(val id: String) : UiAction
        data class OnRetryDocument(val id: String) : UiAction
        data object OnAddMedicalLicense : UiAction
        data class OnRemoveMedicalLicense(val id: String) : UiAction
        data class OnRetryMedicalLicense(val id: String) : UiAction
        data object OnTermsToggle : UiAction
        data object OnTermsClick : UiAction
        data object OnSubmit : UiAction
    }

    sealed interface SideEffect {
        /** Application stored (new or resubmitted): show its status (M05). */
        data object NavigateToStatus : SideEffect

        /** The REGISTER proof is missing (process restart) or was rejected (expired, spent): start again from login. */
        data object NavigateToLogin : SideEffect
        data class OpenContent(val slug: String) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}

/** Content slug of the salon terms (`GET /content/pages/{slug}`). */
object ApplicationSlugs {
    const val SALON_TERMS = "salon-terms"
}

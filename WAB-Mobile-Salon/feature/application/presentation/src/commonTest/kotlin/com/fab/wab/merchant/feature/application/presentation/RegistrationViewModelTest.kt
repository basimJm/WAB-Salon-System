package com.fab.wab.merchant.feature.application.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.salon.Audience
import com.fab.wab.merchant.core.domain.salon.BusinessKind
import com.fab.wab.merchant.core.domain.salon.BusinessType
import com.fab.wab.merchant.core.domain.upload.UploadPurpose
import com.fab.wab.merchant.core.domain.upload.UploadFileUseCase
import com.fab.wab.merchant.core.domain.upload.UploadRejection
import com.fab.wab.merchant.core.ui.media.FakeFilePicker
import com.fab.wab.merchant.core.ui.media.MediaSource
import com.fab.wab.merchant.designsystem.components.upload.MediaPickAction
import com.fab.wab.merchant.core.ui.media.PickedFile
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.feature.application.domain.model.RegistrationField
import com.fab.wab.merchant.feature.application.domain.usecase.ResubmitApplicationUseCase
import com.fab.wab.merchant.feature.application.domain.usecase.SubmitApplicationUseCase
import com.fab.wab.merchant.feature.application.presentation.controller.contract.RegistrationContract.SideEffect
import com.fab.wab.merchant.feature.application.presentation.controller.contract.RegistrationContract.UiAction
import com.fab.wab.merchant.feature.application.presentation.controller.contract.RegistrationMode
import com.fab.wab.merchant.feature.application.presentation.controller.vm.RegistrationDependencies
import com.fab.wab.merchant.feature.application.presentation.controller.vm.RegistrationViewModel
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.model.OtpVerified
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.auth.domain.repository.PendingOtpVerification
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

private const val UNAUTHORIZED = 401
private const val CONFLICT = 409

@OptIn(ExperimentalCoroutinesApi::class)
class RegistrationViewModelTest {
    private val applications = FakeApplications()
    private val locations = FakeLocations()
    private val session = RecordingSessionStore()
    private val uploads = FakeUploads()
    private val picker = FakeFilePicker(documents = listOf(PickedFile("license.pdf", ByteArray(8), "application/pdf")))
    private val pending = PendingOtpVerification()

    private fun TestScope.viewModel(mode: RegistrationMode = RegistrationMode.NEW, salonKind: BusinessKind? = null): RegistrationViewModel {
        val deps = RegistrationDependencies(
            submit = SubmitApplicationUseCase(applications, { null }, session),
            resubmit = ResubmitApplicationUseCase(applications, session),
            locations = locations,
            filePicker = picker,
            uploadFile = UploadFileUseCase(uploads),
            pending = pending,
            analytics = NoOpAnalyticsTracker,
            errorText = { "failed" },
            salonKind = { salonKind },
        )
        return RegistrationViewModel(mode, deps, backgroundScope).also { vm -> backgroundScope.launch { vm.state.collect {} } }
    }

    private fun proof() = pending.publish(OtpVerified(AuthPurpose.REGISTER, PhoneNumber("JO", "791234567"), "proof"))

    private fun RegistrationViewModel.fillValidForm() {
        onEvent(UiAction.OnBusinessTypeSelect(BusinessType.SALON))
        onEvent(UiAction.OnSalonNameChange("Lina Beauty"))
        onEvent(UiAction.OnAudienceSelect(Audience.FEMALE))
        onEvent(UiAction.OnFirstNameChange("Lina"))
        onEvent(UiAction.OnLastNameChange("Haddad"))
        onEvent(UiAction.OnCitySelect(0))
        onEvent(UiAction.OnAreaSelect(0))
        onEvent(UiAction.OnAddDocuments)
        onEvent(UiAction.OnMedia(MediaPickAction.SourceChosen(MediaSource.FILES)))
        onEvent(UiAction.OnTermsToggle)
    }

    @Test
    fun withoutTheRegisterProofTheFlowGoesBackToLogin() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        vm.state.first()
        assertEquals(listOf<SideEffect>(SideEffect.NavigateToLogin), effects)
    }

    @Test
    fun citiesFollowThePhoneCountryAndAreasFollowTheCity() = runTest(UnconfinedTestDispatcher()) {
        proof()
        val vm = viewModel()
        assertEquals(2, vm.state.first { it.cities.isNotEmpty() }.cities.size)
        assertEquals(listOf("JO"), locations.requestedCities)
        vm.onEvent(UiAction.OnCitySelect(1))
        assertEquals("c2-a1", vm.state.first { it.areas.isNotEmpty() }.areas.single().id)
    }

    @Test
    fun aValidFormWithAnUploadedDocumentSubmitsAndSignsTheOwnerIn() = runTest(UnconfinedTestDispatcher()) {
        proof()
        val vm = viewModel()
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        vm.state.first { it.cities.isNotEmpty() }
        vm.onEvent(UiAction.OnSubmit)
        assertTrue(vm.state.first().errorOf(RegistrationField.SALON_NAME))
        vm.fillValidForm()
        val ready = vm.state.first { it.areas.isNotEmpty() && it.canSubmit }
        assertEquals(UploadStatus.Uploaded, ready.documents.single().status)
        vm.onEvent(UiAction.OnSubmit)
        assertEquals(SideEffect.NavigateToStatus, effects.last())
        assertEquals("Lina Beauty", applications.applied.single().salonName)
        assertEquals(listOf("key-8"), applications.applied.single().documentKeys)
        assertEquals("Lina", session.member?.firstName)
        assertEquals(BusinessKind(BusinessType.SALON, Audience.FEMALE), applications.applied.single().kind)
    }

    /** BUSINESS_DOMAIN §5.19: a clinic is not asked for an audience and must upload its medical license. */
    @Test
    fun aClinicSkipsTheAudienceAndNeedsItsMedicalLicense() = runTest(UnconfinedTestDispatcher()) {
        proof()
        val vm = viewModel()
        vm.state.first { it.cities.isNotEmpty() }
        vm.fillValidForm()
        vm.onEvent(UiAction.OnBusinessTypeSelect(BusinessType.CLINIC))
        val missing = vm.state.first { it.areas.isNotEmpty() }
        assertTrue(missing.isClinic)
        assertEquals(null, missing.input.audience, "the salon audience is dropped for a clinic")
        assertEquals(setOf(RegistrationField.MEDICAL_LICENSE), missing.errors)
        vm.onEvent(UiAction.OnAddMedicalLicense)
        vm.onEvent(UiAction.OnMedia(MediaPickAction.SourceChosen(MediaSource.FILES)))
        val ready = vm.state.first { it.canSubmit }
        assertEquals(UploadStatus.Uploaded, ready.medicalDocuments.single().status)
        assertEquals(1, ready.documents.size, "the trade license stays in its own list")
        vm.onEvent(UiAction.OnSubmit)
        val form = applications.applied.single()
        assertEquals(BusinessKind(BusinessType.CLINIC, Audience.BOTH), form.kind)
        assertEquals(1, form.medicalLicenseKeys.size)
        assertEquals(listOf(UploadPurpose.LICENSE_DOCUMENT, UploadPurpose.MEDICAL_LICENSE), uploads.purposes)
        vm.onEvent(UiAction.OnRemoveMedicalLicense(ready.medicalDocuments.single().file.id))
        assertTrue(RegistrationField.MEDICAL_LICENSE in vm.state.first().errors)
    }

    @Test
    fun aResubmissionKeepsTheSalonTypeAndPrefillsItsAudience() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(RegistrationMode.RESUBMIT, salonKind = BusinessKind(BusinessType.SALON, Audience.FEMALE))
        val loaded = vm.state.first { it.typeLocked }
        assertEquals(BusinessType.SALON, loaded.input.businessType)
        assertEquals(Audience.FEMALE, loaded.input.audience)
        vm.onEvent(UiAction.OnBusinessTypeSelect(BusinessType.CLINIC))
        assertEquals(BusinessType.SALON, vm.state.first().input.businessType, "the type never changes")
        vm.onEvent(UiAction.OnAudienceSelect(Audience.BOTH))
        assertEquals(Audience.BOTH, vm.state.first().input.audience)
    }

    /** MER-070: the REGISTER `otpToken` is single use and short-lived; a rejected one needs a new code from login. */
    @Test
    fun aRejectedRegisterProofShowsTheErrorAndReturnsToLogin() = runTest(UnconfinedTestDispatcher()) {
        proof()
        applications.applyResult = AppResult.Error(AppError.ServerError(ErrorCode.OTP_EXPIRED, UNAUTHORIZED, null))
        val vm = viewModel()
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        vm.state.first { it.cities.isNotEmpty() }
        vm.fillValidForm()
        vm.state.first { it.areas.isNotEmpty() && it.canSubmit }
        vm.onEvent(UiAction.OnSubmit)
        assertEquals(listOf(SideEffect.ShowError("failed"), SideEffect.NavigateToLogin), effects.takeLast(2))

        applications.applyResult = AppResult.Error(AppError.ServerError(ErrorCode.PHONE_ALREADY_REGISTERED, CONFLICT, null))
        vm.onEvent(UiAction.OnSubmit)
        assertEquals(SideEffect.ShowError("failed"), effects.last(), "other refusals keep the form")
    }

    @Test
    fun failedUploadsCanBeRetriedAndWrongFilesAreRefused() = runTest(UnconfinedTestDispatcher()) {
        proof()
        uploads.fail = true
        val vm = viewModel()
        vm.onEvent(UiAction.OnAddDocuments)
        vm.onEvent(UiAction.OnMedia(MediaPickAction.SourceChosen(MediaSource.FILES)))
        val failed = vm.state.first { it.documents.isNotEmpty() }.documents.single()
        assertEquals(UploadStatus.Failed, failed.status)
        assertTrue(RegistrationField.DOCUMENTS in vm.state.first().errors)
        uploads.fail = false
        vm.onEvent(UiAction.OnRetryDocument(failed.file.id))
        assertEquals(
            UploadStatus.Uploaded,
            vm.state.first { it.documents.single().status == UploadStatus.Uploaded }.documents.single().status,
        )
        picker.documents = listOf(PickedFile("notes.docx", ByteArray(2), "application/msword"))
        vm.onEvent(UiAction.OnAddDocuments)
        vm.onEvent(UiAction.OnMedia(MediaPickAction.SourceChosen(MediaSource.FILES)))
        assertEquals(UploadRejection.WRONG_TYPE, vm.state.first().documentRejection)
        vm.onEvent(UiAction.OnRemoveDocument(failed.file.id))
        assertTrue(vm.state.first().documents.isEmpty())
    }

    @Test
    fun resubmissionNeedsOnlyTypeNameAudienceAndDocuments() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(RegistrationMode.RESUBMIT)
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        vm.onEvent(UiAction.OnBusinessTypeSelect(BusinessType.SALON))
        vm.onEvent(UiAction.OnSalonNameChange("Gents"))
        vm.onEvent(UiAction.OnAudienceSelect(Audience.MALE))
        vm.onEvent(UiAction.OnAddDocuments)
        vm.onEvent(UiAction.OnMedia(MediaPickAction.SourceChosen(MediaSource.FILES)))
        assertFalse(vm.state.first { it.documents.isNotEmpty() }.errors.isNotEmpty())
        vm.onEvent(UiAction.OnSubmit)
        assertEquals(listOf<SideEffect>(SideEffect.NavigateToStatus), effects)
        assertEquals("Gents", applications.resubmitted.single().salonName)
    }
}

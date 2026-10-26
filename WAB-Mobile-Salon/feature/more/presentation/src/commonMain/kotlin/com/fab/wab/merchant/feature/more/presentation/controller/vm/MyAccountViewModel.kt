package com.fab.wab.merchant.feature.more.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.common.FormValidators
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.core.domain.locations.defaultCountry
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.domain.upload.LocalFile
import com.fab.wab.merchant.core.domain.upload.UploadFileUseCase
import com.fab.wab.merchant.core.domain.upload.UploadKind
import com.fab.wab.merchant.core.domain.upload.UploadProgress
import com.fab.wab.merchant.core.domain.upload.UploadPurpose
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.core.ui.media.CropRegion
import com.fab.wab.merchant.core.ui.media.FilePicker
import com.fab.wab.merchant.core.ui.media.ImageCropper
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.designsystem.components.upload.LocalPreview
import com.fab.wab.merchant.designsystem.components.upload.UploadItemUi
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.repository.PendingOtpVerification
import com.fab.wab.merchant.feature.more.domain.AccountLimits
import com.fab.wab.merchant.feature.more.domain.AccountRepository
import com.fab.wab.merchant.feature.more.domain.MyAccount
import com.fab.wab.merchant.feature.more.domain.PhotoChange
import com.fab.wab.merchant.feature.more.presentation.analytics.MoreAnalytics
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MyAccountContract.PhoneForm
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MyAccountContract.SideEffect
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MyAccountContract.UiAction
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MyAccountContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

private const val PHOTO_ID = "my-photo"

class MyAccountDependencies(
    val account: AccountRepository,
    val session: SessionStore,
    val locations: LocationsRepository,
    val picker: FilePicker,
    val cropper: ImageCropper,
    val upload: UploadFileUseCase,
    val pending: PendingOtpVerification,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** PRD M25 My account: photo (1:1 crop, MEMBER_PHOTO), first / last name, phone (change → OTP to the new number), role. */
class MyAccountViewModel(
    private val deps: MyAccountDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    override fun onStart() {
        load()
    }

    override fun handle(event: UiAction) {
        handleForm(event) || handlePhoto(event) || handlePhone(event)
    }

    private fun handleForm(event: UiAction): Boolean {
        when (event) {
            UiAction.OnRetry -> load()
            is UiAction.OnFirstName -> updateState { copy(firstName = event.value.take(AccountLimits.NAME_MAX)) }
            is UiAction.OnLastName -> updateState { copy(lastName = event.value.take(AccountLimits.NAME_MAX)) }
            UiAction.OnSave -> save()
            else -> return false
        }
        return true
    }

    private fun handlePhoto(event: UiAction): Boolean {
        when (event) {
            UiAction.OnPickPhoto -> scope.launch {
                val file = deps.picker.pickMedia(maxCount = 1, includeVideo = false).firstOrNull() ?: return@launch
                updateState { copy(cropBytes = file.bytes) }
            }
            is UiAction.OnCropConfirm -> crop(event.region)
            UiAction.OnCropCancel -> updateState { copy(cropBytes = null) }
            UiAction.OnRemovePhoto -> updateState { copy(photo = null, photoChange = PhotoChange.Remove) }
            else -> return false
        }
        return true
    }

    private fun handlePhone(event: UiAction): Boolean {
        when (event) {
            UiAction.OnChangePhone -> updateState {
                copy(phoneForm = PhoneForm(countryCode = countries.defaultCountry()?.code.orEmpty()))
            }
            UiAction.OnPhoneDismiss -> updateState { copy(phoneForm = null) }
            UiAction.OnCountryClick -> editPhone { copy(pickerOpen = true) }
            is UiAction.OnCountrySelect -> editPhone { copy(countryCode = event.code, pickerOpen = false) }
            UiAction.OnCountryDismiss -> editPhone { copy(pickerOpen = false) }
            is UiAction.OnNumber -> editPhone { copy(number = event.value) }
            UiAction.OnPhoneContinue -> verifyPhone()
            UiAction.OnResume -> if (uiState.value.awaitingOtp) finishPhoneChange()
            else -> return false
        }
        return true
    }

    private fun editPhone(block: PhoneForm.() -> PhoneForm) = updateState { copy(phoneForm = phoneForm?.block()) }

    private fun load() {
        scope.launch {
            updateState { copy(loading = true, error = null) }
            if (uiState.value.countries.isEmpty()) {
                val countries = (deps.locations.countries() as? AppResult.Success)?.data.orEmpty()
                updateState { copy(countries = countries) }
            }
            when (val result = deps.account.me()) {
                is AppResult.Success -> show(result.data)
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    updateState { copy(loading = false, error = message) }
                }
                AppResult.Loading -> Unit
            }
        }
    }

    /** Shows the server's account and keeps the session's first name in step with it. */
    private suspend fun show(account: MyAccount) {
        val photo = account.photoUrl?.let { UploadItemUi(PHOTO_ID, PHOTO_ID, UploadKind.IMAGE, UploadStatus.Uploaded, url = it) }
        updateState {
            copy(
                account = account,
                loading = false,
                firstName = account.firstName,
                lastName = account.lastName,
                photo = photo,
                photoChange = PhotoChange.Keep,
                showErrors = false,
            )
        }
        val session = deps.session.state.first() as? SessionState.SignedIn ?: return
        if (session.member.firstName != account.firstName) deps.session.updateMember(session.member.copy(firstName = account.firstName))
    }

    private fun crop(region: CropRegion) {
        val bytes = uiState.value.cropBytes ?: return
        updateState { copy(cropBytes = null) }
        scope.launch {
            val image = deps.cropper.crop(bytes, region) ?: return@launch
            val file = LocalFile(PHOTO_ID, PHOTO_ID, image.bytes, image.contentType)
            deps.upload(file, UploadPurpose.MEMBER_PHOTO).collect { progress ->
                val status = when (progress) {
                    is UploadProgress.Uploading -> UploadStatus.Uploading(progress.fraction)
                    is UploadProgress.Done -> UploadStatus.Uploaded
                    is UploadProgress.Failed -> UploadStatus.Failed
                }
                updateState { copy(photo = UploadItemUi(PHOTO_ID, PHOTO_ID, UploadKind.IMAGE, status, preview = LocalPreview(file.bytes))) }
                when (progress) {
                    is UploadProgress.Done -> updateState { copy(photoChange = PhotoChange.Set(progress.upload.key)) }
                    is UploadProgress.Failed -> emitSideEffect(SideEffect.ShowError(deps.errorText(progress.error)))
                    is UploadProgress.Uploading -> Unit
                }
            }
        }
    }

    private fun save() {
        val state = uiState.value
        if (!state.canSave) return
        if (state.errors.isNotEmpty()) {
            updateState { copy(showErrors = true) }
            return
        }
        scope.launch {
            updateState { copy(saving = true) }
            val result = deps.account.update(state.firstName, state.lastName, state.photoChange)
            updateState { copy(saving = false) }
            when (result) {
                is AppResult.Success -> {
                    deps.analytics.trackAction(AnalyticsAction(MoreAnalytics.ACTION_ACCOUNT_UPDATE))
                    show(result.data)
                    emitSideEffect(SideEffect.Saved)
                }
                is AppResult.Error -> emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                AppResult.Loading -> Unit
            }
        }
    }

    /** A valid new number opens the OTP screen (purpose CHANGE_PHONE); an old proof is dropped first. */
    private fun verifyPhone() {
        val state = uiState.value
        val form = state.phoneForm ?: return
        if (!state.phoneValid) {
            editPhone { copy(showError = true) }
            return
        }
        deps.pending.consume()
        updateState { copy(awaitingOtp = true, phoneForm = null) }
        emitSideEffect(SideEffect.VerifyPhone(form.countryCode, FormValidators.normalizeNationalNumber(form.number)))
    }

    /** Back from the OTP screen: the proof changes the phone; no proof = the member went back. */
    private fun finishPhoneChange() {
        val proof = deps.pending.consume()?.takeIf { it.purpose == AuthPurpose.CHANGE_PHONE }
        updateState { copy(awaitingOtp = false) }
        proof ?: return
        scope.launch {
            updateState { copy(changingPhone = true) }
            val result = deps.account.changePhone(proof.phone.countryCode, proof.phone.number, proof.otpToken)
            updateState { copy(changingPhone = false) }
            when (result) {
                is AppResult.Success -> {
                    deps.analytics.trackAction(AnalyticsAction(MoreAnalytics.ACTION_CHANGE_PHONE))
                    show(result.data)
                    emitSideEffect(SideEffect.PhoneChanged)
                }
                is AppResult.Error -> emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                AppResult.Loading -> Unit
            }
        }
    }
}

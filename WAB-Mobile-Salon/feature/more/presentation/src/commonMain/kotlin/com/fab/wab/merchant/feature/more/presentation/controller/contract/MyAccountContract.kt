package com.fab.wab.merchant.feature.more.presentation.controller.contract

import com.fab.wab.merchant.core.common.FormValidators
import com.fab.wab.merchant.core.domain.locations.Country
import com.fab.wab.merchant.core.ui.media.CropRegion
import com.fab.wab.merchant.designsystem.components.upload.MediaPickAction
import com.fab.wab.merchant.designsystem.components.upload.MediaPickUi
import com.fab.wab.merchant.designsystem.components.upload.UploadItemUi
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.feature.more.domain.AccountField
import com.fab.wab.merchant.feature.more.domain.MyAccount
import com.fab.wab.merchant.feature.more.domain.PhotoChange
import com.fab.wab.merchant.feature.more.domain.accountErrors

sealed interface MyAccountContract {
    /** The change-phone form (new number + country) shown in a sheet. */
    data class PhoneForm(
        val countryCode: String = "",
        val number: String = "",
        val pickerOpen: Boolean = false,
        val showError: Boolean = false,
    )

    data class UiState(
        val account: MyAccount? = null,
        val loading: Boolean = true,
        val error: String? = null,
        val firstName: String = "",
        val lastName: String = "",
        val photo: UploadItemUi? = null,
        val photoChange: PhotoChange = PhotoChange.Keep,
        val cropBytes: ByteArray? = null,
        val media: MediaPickUi = MediaPickUi(),
        val showErrors: Boolean = false,
        val saving: Boolean = false,
        val countries: List<Country> = emptyList(),
        val phoneForm: PhoneForm? = null,
        val awaitingOtp: Boolean = false,
        val changingPhone: Boolean = false,
    ) {
        val errors: Set<AccountField> get() = accountErrors(firstName, lastName)
        val visibleErrors: Set<AccountField> get() = if (showErrors) errors else emptySet()
        val changed: Boolean
            get() = account != null &&
                (firstName.trim() != account.firstName || lastName.trim() != account.lastName || photoChange != PhotoChange.Keep)
        val uploading: Boolean get() = photo?.status is UploadStatus.Uploading
        val canSave: Boolean get() = changed && !saving && !uploading
        val phoneCountry: Country? get() = phoneForm?.let { form -> countries.firstOrNull { it.code == form.countryCode } }
        val phoneValid: Boolean
            get() = phoneForm?.let { form -> phoneCountry?.let { FormValidators.isValidPhone(form.number, it.phoneRegex) } } == true
    }

    sealed interface UiAction {
        data object OnRetry : UiAction
        data class OnFirstName(val value: String) : UiAction
        data class OnLastName(val value: String) : UiAction
        data object OnPickPhoto : UiAction
        data class OnMedia(val action: MediaPickAction) : UiAction
        data class OnCropConfirm(val region: CropRegion) : UiAction
        data object OnCropCancel : UiAction
        data object OnRemovePhoto : UiAction
        data object OnSave : UiAction
        data object OnChangePhone : UiAction
        data object OnPhoneDismiss : UiAction
        data object OnCountryClick : UiAction
        data class OnCountrySelect(val code: String) : UiAction
        data object OnCountryDismiss : UiAction
        data class OnNumber(val value: String) : UiAction
        data object OnPhoneContinue : UiAction

        /** Back from the OTP screen: a CHANGE_PHONE proof is used once. */
        data object OnResume : UiAction
    }

    sealed interface SideEffect {
        data object Saved : SideEffect
        data class VerifyPhone(val countryCode: String, val number: String) : SideEffect
        data object PhoneChanged : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}

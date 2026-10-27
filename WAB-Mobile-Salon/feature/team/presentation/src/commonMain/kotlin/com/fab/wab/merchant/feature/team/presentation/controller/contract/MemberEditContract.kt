package com.fab.wab.merchant.feature.team.presentation.controller.contract

import com.fab.wab.merchant.core.common.FormValidators
import com.fab.wab.merchant.core.domain.branch.Branch
import com.fab.wab.merchant.core.domain.locations.Country
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.ui.media.CropRegion
import com.fab.wab.merchant.designsystem.components.upload.MediaPickAction
import com.fab.wab.merchant.designsystem.components.upload.MediaPickUi
import com.fab.wab.merchant.designsystem.components.upload.UploadItemUi
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.feature.team.domain.MemberDraft
import com.fab.wab.merchant.feature.team.domain.MemberField
import com.fab.wab.merchant.feature.team.domain.memberErrors

sealed interface MemberEditContract {
    data class UiState(
        val loading: Boolean = true,
        val error: String? = null,
        val memberId: String? = null,
        val providesServices: Boolean = false,
        val phone: String = "",
        val original: MemberDraft = MemberDraft(),
        val draft: MemberDraft = MemberDraft(),
        val countries: List<Country> = emptyList(),
        val countryPickerOpen: Boolean = false,
        val photo: UploadItemUi? = null,
        val cropBytes: ByteArray? = null,
        val media: MediaPickUi = MediaPickUi(),
        val showErrors: Boolean = false,
        val saving: Boolean = false,
        /** Branches a member can belong to (closed ones excluded); empty = the choice is not offered. */
        val branches: List<Branch> = emptyList(),
        /** Moving the member was refused with `409 SCHEDULE_CONFLICT`: the bookings that would break. */
        val moveConflict: List<String>? = null,
    ) {
        val isNew: Boolean get() = memberId == null
        val country: Country? get() = countries.firstOrNull { it.code == draft.countryCode }
        val phoneValid: Boolean get() = country?.let { FormValidators.isValidPhone(draft.number, it.phoneRegex) } == true
        val errors: Set<MemberField> get() = memberErrors(draft, isNew, phoneValid, branchRequired = branches.isNotEmpty())
        val visibleErrors: Set<MemberField> get() = if (showErrors) errors else emptySet()
        val canSave: Boolean get() = (isNew || draft != original) && !saving && photo?.status !is UploadStatus.Uploading
    }

    sealed interface UiAction {
        data class OnFirstName(val value: String) : UiAction
        data class OnLastName(val value: String) : UiAction
        data class OnNumber(val value: String) : UiAction
        data object OnCountryClick : UiAction
        data class OnCountrySelect(val code: String) : UiAction
        data object OnCountryDismiss : UiAction
        data object OnPickPhoto : UiAction
        data class OnMedia(val action: MediaPickAction) : UiAction
        data class OnCropConfirm(val region: CropRegion) : UiAction
        data object OnCropCancel : UiAction
        data object OnRemovePhoto : UiAction
        data class OnRole(val role: MemberRole) : UiAction
        data object OnSave : UiAction
        data object OnPermissions : UiAction
        data object OnStaffProfile : UiAction
        data object OnRetry : UiAction
        data class OnBranch(val index: Int) : UiAction
        data object OnConflictCancelBookings : UiAction
        data object OnConflictReassign : UiAction
        data object OnConflictDismiss : UiAction
    }

    sealed interface SideEffect {
        data class Saved(val added: Boolean) : SideEffect
        data class OpenPermissions(val memberId: String) : SideEffect
        data class OpenStaff(val memberId: String) : SideEffect
        data class ShowError(val message: String) : SideEffect
        data class OpenBooking(val bookingId: String) : SideEffect
    }
}

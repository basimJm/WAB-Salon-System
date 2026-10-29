package com.fab.wab.merchant.feature.salon.presentation.controller.contract

import com.fab.wab.merchant.core.domain.locations.Area
import com.fab.wab.merchant.core.domain.locations.City
import com.fab.wab.merchant.core.domain.salon.SalonProfile
import com.fab.wab.merchant.core.ui.media.CropRegion
import com.fab.wab.merchant.designsystem.components.map.MapPickerAction
import com.fab.wab.merchant.designsystem.components.map.MapPickerUi
import com.fab.wab.merchant.designsystem.components.upload.MediaPickAction
import com.fab.wab.merchant.designsystem.components.upload.MediaPickUi
import com.fab.wab.merchant.designsystem.components.upload.UploadItemUi
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.feature.salon.domain.ProfileField
import com.fab.wab.merchant.feature.salon.domain.ProfileForm
import com.fab.wab.merchant.feature.salon.domain.profileErrors

/** Which image slot an upload belongs to (cover 16:9, profile 1:1). */
enum class ProfileImage { COVER, PROFILE }

/** A picked image waiting for the crop sheet. */
class CropRequest(val target: ProfileImage, val bytes: ByteArray)

sealed interface SalonProfileContract {
    data class UiState(
        val loading: Boolean = true,
        val salon: SalonProfile? = null,
        val original: ProfileForm = ProfileForm(),
        val form: ProfileForm = ProfileForm(),
        val showErrors: Boolean = false,
        val cover: UploadItemUi? = null,
        val profile: UploadItemUi? = null,
        val crop: CropRequest? = null,
        val media: MediaPickUi = MediaPickUi(),
        val map: MapPickerUi? = null,
        val cities: List<City> = emptyList(),
        val areas: List<Area> = emptyList(),
        val saving: Boolean = false,
        val unsavedDialog: Boolean = false,
        val previewOpen: Boolean = false,
        val error: String? = null,
        /** Only the owner may widen the audience (BUSINESS_DOMAIN §5.19); hidden for everyone else. */
        val isOwner: Boolean = false,
        val widenDialog: Boolean = false,
        val widening: Boolean = false,
    ) {
        val canWidenAudience: Boolean get() = isOwner && salon?.kind?.canWidenAudience == true
        val errors: Set<ProfileField> get() = profileErrors(form)
        val visibleErrors: Set<ProfileField> get() = if (showErrors) errors else emptySet()
        val uploading: Boolean get() = listOfNotNull(cover, profile).any { it.status is UploadStatus.Uploading }
        val dirty: Boolean get() = form != original
        val canSave: Boolean get() = dirty && !saving && !uploading
    }

    sealed interface UiAction {
        data class OnName(val value: String) : UiAction
        data class OnDescription(val value: String) : UiAction
        data class OnLocationText(val value: String) : UiAction
        data class OnCity(val index: Int) : UiAction
        data class OnArea(val index: Int) : UiAction
        data class OnPhone(val value: String) : UiAction
        data class OnWhatsapp(val value: String) : UiAction
        data class OnPickImage(val target: ProfileImage) : UiAction
        data class OnCropConfirm(val region: CropRegion) : UiAction
        data object OnCropCancel : UiAction
        data class OnRetryImage(val target: ProfileImage) : UiAction
        data class OnMedia(val action: MediaPickAction) : UiAction
        data object OnOpenMap : UiAction
        data object OnOpenInMaps : UiAction
        data class OnMap(val action: MapPickerAction) : UiAction
        data object OnCloseMap : UiAction
        data object OnPreview : UiAction
        data object OnClosePreview : UiAction
        data object OnSave : UiAction
        data object OnBack : UiAction
        data object OnDiscard : UiAction
        data object OnSaveAndLeave : UiAction
        data object OnKeepEditing : UiAction
        data object OnRetry : UiAction
        data object OnWidenAudience : UiAction
        data object OnConfirmWiden : UiAction
        data object OnDismissWiden : UiAction
    }

    sealed interface SideEffect {
        data object Saved : SideEffect
        data object AudienceWidened : SideEffect
        data object NavigateBack : SideEffect
        data class ShowError(val message: String) : SideEffect
        data class OpenInMaps(val latitude: Double, val longitude: Double, val label: String) : SideEffect
    }
}

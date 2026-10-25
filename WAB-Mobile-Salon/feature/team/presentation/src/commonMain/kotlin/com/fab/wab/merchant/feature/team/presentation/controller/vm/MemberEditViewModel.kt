package com.fab.wab.merchant.feature.team.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.common.FormValidators
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.core.domain.locations.defaultCountry
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
import com.fab.wab.merchant.feature.team.domain.ASSIGNABLE_ROLES
import com.fab.wab.merchant.feature.team.domain.MemberDraft
import com.fab.wab.merchant.feature.team.domain.MemberLimits
import com.fab.wab.merchant.feature.team.domain.TeamRepository
import com.fab.wab.merchant.feature.team.domain.toDraft
import com.fab.wab.merchant.feature.team.presentation.analytics.TeamAnalytics
import com.fab.wab.merchant.feature.team.presentation.controller.contract.MemberEditContract.SideEffect
import com.fab.wab.merchant.feature.team.presentation.controller.contract.MemberEditContract.UiAction
import com.fab.wab.merchant.feature.team.presentation.controller.contract.MemberEditContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

private const val PHOTO_ID = "member-photo"

class MemberEditDependencies(
    val team: TeamRepository,
    val locations: LocationsRepository,
    val picker: FilePicker,
    val cropper: ImageCropper,
    val upload: UploadFileUseCase,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** PRD M17 member form (owner): names, phone (new members only), photo (1:1 crop), role; permissions / staff profile links. */
class MemberEditViewModel(
    private val memberId: String?,
    private val deps: MemberEditDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(memberId = memberId), testScope) {

    override fun onStart() {
        load()
    }

    override fun handle(event: UiAction) {
        handleForm(event) || handlePhoto(event) || handleActions(event)
    }

    private fun handleForm(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnFirstName -> edit { copy(firstName = event.value.take(MemberLimits.NAME_MAX)) }
            is UiAction.OnLastName -> edit { copy(lastName = event.value.take(MemberLimits.NAME_MAX)) }
            is UiAction.OnNumber -> if (uiState.value.isNew) edit { copy(number = FormValidators.normalizeNationalNumber(event.value)) }
            UiAction.OnCountryClick -> if (uiState.value.isNew) updateState { copy(countryPickerOpen = true) }
            is UiAction.OnCountrySelect -> {
                edit { copy(countryCode = event.code) }
                updateState { copy(countryPickerOpen = false) }
            }
            UiAction.OnCountryDismiss -> updateState { copy(countryPickerOpen = false) }
            else -> return false
        }
        return true
    }

    private fun handlePhoto(event: UiAction): Boolean {
        when (event) {
            UiAction.OnPickPhoto -> pickPhoto()
            is UiAction.OnCropConfirm -> crop(event.region)
            UiAction.OnCropCancel -> updateState { copy(cropBytes = null) }
            UiAction.OnRemovePhoto -> {
                edit { copy(photoKey = null, photoUrl = null) }
                updateState { copy(photo = null) }
            }
            else -> return false
        }
        return true
    }

    private fun handleActions(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnRole -> if (event.role in ASSIGNABLE_ROLES) edit { copy(role = event.role) }
            UiAction.OnSave -> save()
            UiAction.OnPermissions -> memberId?.let { emitSideEffect(SideEffect.OpenPermissions(it)) }
            UiAction.OnStaffProfile -> memberId?.let { emitSideEffect(SideEffect.OpenStaff(it)) }
            UiAction.OnRetry -> load()
            else -> return false
        }
        return true
    }

    private fun edit(change: MemberDraft.() -> MemberDraft) = updateState { copy(draft = draft.change()) }

    private fun load() {
        scope.launch {
            updateState { copy(loading = true, error = null) }
            val countries = (deps.locations.countries() as? AppResult.Success)?.data.orEmpty()
            val id = memberId
            if (id == null) {
                val draft = MemberDraft(countryCode = countries.defaultCountry()?.code.orEmpty())
                updateState { copy(loading = false, countries = countries, original = draft, draft = draft) }
                return@launch
            }
            val member = deps.team.cached(id) ?: when (val result = deps.team.member(id)) {
                is AppResult.Success -> result.data
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    updateState { copy(loading = false, error = message) }
                    return@launch
                }
                AppResult.Loading -> return@launch
            }
            val draft = member.toDraft()
            val photo = member.photoUrl?.let { UploadItemUi(PHOTO_ID, PHOTO_ID, UploadKind.IMAGE, UploadStatus.Uploaded, url = it) }
            updateState {
                copy(
                    loading = false,
                    countries = countries,
                    phone = member.phone,
                    providesServices = member.providesServices,
                    original = draft,
                    draft = draft,
                    photo = photo,
                )
            }
        }
    }

    private fun pickPhoto() {
        scope.launch {
            val file = deps.picker.pickMedia(maxCount = 1, includeVideo = false).firstOrNull() ?: return@launch
            updateState { copy(cropBytes = file.bytes) }
        }
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
                    is UploadProgress.Done -> edit { copy(photoKey = progress.upload.key, photoUrl = progress.upload.url) }
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
            val id = memberId
            val result = if (id == null) deps.team.create(state.draft, permissions = null) else deps.team.update(id, state.draft)
            updateState { copy(saving = false) }
            when (result) {
                is AppResult.Success -> {
                    deps.analytics.trackAction(AnalyticsAction(
                        TeamAnalytics.ACTION_MEMBER_SAVE,
                        analyticsParams { text(TeamAnalytics.PARAM_NEW, (id == null).toString()) },
                    ))
                    emitSideEffect(SideEffect.Saved(added = id == null))
                }
                is AppResult.Error -> emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                AppResult.Loading -> Unit
            }
        }
    }
}

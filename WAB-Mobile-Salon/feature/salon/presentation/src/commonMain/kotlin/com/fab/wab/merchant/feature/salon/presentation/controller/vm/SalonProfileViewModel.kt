package com.fab.wab.merchant.feature.salon.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.locations.LocationDefaults
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.core.domain.salon.SalonProfile
import com.fab.wab.merchant.core.domain.salon.SalonRepository
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
import com.fab.wab.merchant.designsystem.components.map.MapPickerUi
import com.fab.wab.merchant.designsystem.components.upload.LocalPreview
import com.fab.wab.merchant.designsystem.components.upload.MediaPickHandler
import com.fab.wab.merchant.designsystem.components.upload.PHOTO_SOURCES
import com.fab.wab.merchant.designsystem.components.upload.UploadItemUi
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.feature.salon.domain.ProfileForm
import com.fab.wab.merchant.feature.salon.domain.ProfileLimits
import com.fab.wab.merchant.feature.salon.domain.SalonProfileRepository
import com.fab.wab.merchant.feature.salon.domain.changesOf
import com.fab.wab.merchant.feature.salon.domain.toForm
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.CropRequest
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ProfileImage
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonProfileContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonProfileContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonProfileContract.UiState
import com.fab.wab.merchant.designsystem.components.map.MapPickerController
import com.fab.wab.merchant.designsystem.components.map.MapPickerHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

class SalonProfileDependencies(
    val salon: SalonRepository,
    val profiles: SalonProfileRepository,
    val locations: LocationsRepository,
    val filePicker: FilePicker,
    val cropper: ImageCropper,
    val upload: UploadFileUseCase,
    val map: MapPickerController,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** PRD M13: edit the salon profile, upload cover / profile images (cropped), pin the location, guard unsaved changes. */
class SalonProfileViewModel(
    private val deps: SalonProfileDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private val mapHandler = MapPickerHandler(deps.map, scope, ::readMap, ::writeMap)
    private val media = MediaPickHandler(deps.filePicker, scope, { uiState.value.media }) { updateState { copy(media = it) } }

    override fun onStart() {
        load()
    }

    override fun handle(event: UiAction) {
        handleForm(event) || handleMedia(event) || handleExit(event)
    }

    private fun handleForm(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnName -> edit { copy(name = event.value.take(ProfileLimits.NAME_MAX)) }
            is UiAction.OnDescription -> edit { copy(description = event.value.take(ProfileLimits.DESCRIPTION_MAX)) }
            is UiAction.OnLocationText -> edit { copy(locationText = event.value.take(ProfileLimits.LOCATION_TEXT_MAX)) }
            is UiAction.OnCity -> selectCity(event.index)
            is UiAction.OnArea -> uiState.value.areas.getOrNull(event.index)?.let { area -> edit { copy(areaId = area.id) } }
            is UiAction.OnPhone -> edit { copy(phone = event.value) }
            is UiAction.OnWhatsapp -> edit { copy(whatsapp = event.value) }
            else -> return false
        }
        return true
    }

    private fun handleMedia(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnPickImage -> pick(event.target)
            is UiAction.OnCropConfirm -> crop(event.region)
            UiAction.OnCropCancel -> updateState { copy(crop = null) }
            is UiAction.OnRetryImage -> retry(event.target)
            UiAction.OnOpenMap -> uiState.value.form.let { mapHandler.open(it.location, it.locationText) }
            is UiAction.OnMap -> mapHandler.handle(event.action, onConfirm = { point, address ->
                edit { copy(location = point, locationText = address ?: locationText) }
            })
            UiAction.OnCloseMap -> updateState { copy(map = null) }
            UiAction.OnPreview -> updateState { copy(previewOpen = true) }
            UiAction.OnClosePreview -> updateState { copy(previewOpen = false) }
            else -> return false
        }
        return true
    }

    private fun handleExit(event: UiAction): Boolean {
        when (event) {
            UiAction.OnSave -> save(leave = false)
            UiAction.OnSaveAndLeave -> {
                updateState { copy(unsavedDialog = false) }
                save(leave = true)
            }
            UiAction.OnBack -> if (uiState.value.dirty) updateState {
                copy(unsavedDialog = true)
            } else emitSideEffect(SideEffect.NavigateBack)
            UiAction.OnDiscard -> {
                updateState { copy(unsavedDialog = false) }
                emitSideEffect(SideEffect.NavigateBack)
            }
            UiAction.OnKeepEditing -> updateState { copy(unsavedDialog = false) }
            UiAction.OnRetry -> load()
            is UiAction.OnMedia -> media.handle(event.action)
            UiAction.OnOpenInMaps -> openInMaps()
            else -> return false
        }
        return true
    }

    private fun readMap() = uiState.value.map

    private fun writeMap(map: MapPickerUi?) = updateState { copy(map = map) }

    private fun edit(change: ProfileForm.() -> ProfileForm) =
        updateState { copy(form = form.change()) }

    private fun load() {
        scope.launch {
            updateState { copy(loading = true, error = null) }
            val salon = deps.salon.current.value ?: when (val result = deps.salon.refresh()) {
                is AppResult.Success -> result.data
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    updateState { copy(loading = false, error = message) }
                    return@launch
                }
                AppResult.Loading -> return@launch
            }
            show(salon)
            loadCities(salon.cityId)
        }
    }

    private fun show(salon: SalonProfile) {
        val form = salon.toForm()
        updateState {
            copy(
                loading = false,
                salon = salon,
                original = form,
                form = form,
                cover = form.coverUrl?.let { uploaded(ProfileImage.COVER, it) },
                profile = form.profileUrl?.let { uploaded(ProfileImage.PROFILE, it) },
            )
        }
    }

    private suspend fun loadCities(cityId: String?) {
        (deps.locations.cities(LocationDefaults.DEFAULT_COUNTRY_CODE) as? AppResult.Success)?.let { cities ->
            updateState { copy(cities = cities.data) }
        }
        if (cityId != null) (deps.locations.areas(cityId) as? AppResult.Success)?.let { areas -> updateState { copy(areas = areas.data) } }
    }

    private fun selectCity(index: Int) {
        val city = uiState.value.cities.getOrNull(index) ?: return
        if (city.id == uiState.value.form.cityId) return
        edit { copy(cityId = city.id, areaId = null) }
        updateState { copy(areas = emptyList()) }
        scope.launch { (deps.locations.areas(city.id) as? AppResult.Success)?.let { areas -> updateState { copy(areas = areas.data) } } }
    }

    private fun pick(target: ProfileImage) {
        media.open(PHOTO_SOURCES, maxCount = 1) { files ->
            files.firstOrNull()?.let { file -> updateState { copy(crop = CropRequest(target, file.bytes)) } }
        }
    }

    private fun openInMaps() {
        val form = uiState.value.form
        val point = form.location ?: return
        emitSideEffect(SideEffect.OpenInMaps(point.latitude, point.longitude, form.name.ifBlank { form.locationText }))
    }

    private fun crop(region: CropRegion) {
        val request = uiState.value.crop ?: return
        updateState { copy(crop = null) }
        scope.launch {
            val image = deps.cropper.crop(request.bytes, region) ?: return@launch
            pending[request.target] = LocalFile(request.target.name, request.target.name, image.bytes, image.contentType)
            upload(request.target)
        }
    }

    /** Last cropped file per slot, kept for retry. */
    private val pending = mutableMapOf<ProfileImage, LocalFile>()

    private fun retry(target: ProfileImage) {
        if (pending[target] != null) scope.launch { upload(target) }
    }

    private suspend fun upload(target: ProfileImage) {
        val file = pending[target] ?: return
        val purpose = if (target == ProfileImage.COVER) UploadPurpose.SALON_COVER else UploadPurpose.SALON_PROFILE
        deps.upload(file, purpose).collect { progress ->
            val status = when (progress) {
                is UploadProgress.Uploading -> UploadStatus.Uploading(progress.fraction)
                is UploadProgress.Done -> UploadStatus.Uploaded
                is UploadProgress.Failed -> UploadStatus.Failed
            }
            val item = UploadItemUi(target.name, target.name, UploadKind.IMAGE, status, preview = LocalPreview(file.bytes))
            updateState { if (target == ProfileImage.COVER) copy(cover = item) else copy(profile = item) }
            when (progress) {
                is UploadProgress.Done -> edit {
                    if (target == ProfileImage.COVER) copy(
                        coverKey = progress.upload.key,
                        coverUrl = progress.upload.url,
                    ) else copy(profileKey = progress.upload.key, profileUrl = progress.upload.url)
                }
                is UploadProgress.Failed -> emitSideEffect(SideEffect.ShowError(deps.errorText(progress.error)))
                is UploadProgress.Uploading -> Unit
            }
        }
    }

    private fun save(leave: Boolean) {
        val state = uiState.value
        if (!state.canSave) return
        if (state.errors.isNotEmpty()) {
            updateState { copy(showErrors = true) }
            return
        }
        scope.launch {
            updateState { copy(saving = true) }
            when (val result = deps.profiles.update(changesOf(state.original, state.form))) {
                is AppResult.Success -> {
                    deps.analytics.trackAction(AnalyticsAction(SalonAnalytics.ACTION_PROFILE_SAVE))
                    show(result.data)
                    updateState { copy(saving = false, showErrors = false) }
                    emitSideEffect(SideEffect.Saved)
                    if (leave) emitSideEffect(SideEffect.NavigateBack)
                }
                is AppResult.Error -> {
                    updateState { copy(saving = false) }
                    emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun uploaded(
        target: ProfileImage,
        url: String,
    ) = UploadItemUi(target.name, target.name, UploadKind.IMAGE, UploadStatus.Uploaded, url = url)
}

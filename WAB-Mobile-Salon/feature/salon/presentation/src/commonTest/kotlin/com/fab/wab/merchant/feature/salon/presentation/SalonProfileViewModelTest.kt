package com.fab.wab.merchant.feature.salon.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.salon.Audience
import com.fab.wab.merchant.core.domain.salon.BusinessType
import com.fab.wab.merchant.core.domain.location.ReverseGeocoder
import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.core.domain.upload.UploadFileUseCase
import com.fab.wab.merchant.core.ui.media.CropRegion
import com.fab.wab.merchant.core.ui.media.FakeFilePicker
import com.fab.wab.merchant.core.ui.media.MediaSource
import com.fab.wab.merchant.core.ui.media.FakeImageCropper
import com.fab.wab.merchant.core.ui.media.PickedFile
import com.fab.wab.merchant.core.ui.media.PickedImage
import com.fab.wab.merchant.core.ui.permission.PermissionFlow
import com.fab.wab.merchant.core.ui.permission.PermissionStatus
import com.fab.wab.merchant.designsystem.components.map.MapNotice
import com.fab.wab.merchant.designsystem.components.map.MapPickerAction
import com.fab.wab.merchant.designsystem.components.upload.MediaPickAction
import com.fab.wab.merchant.designsystem.components.upload.PHOTO_SOURCES
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.feature.salon.domain.Change
import com.fab.wab.merchant.feature.salon.domain.ProfileField
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ProfileImage
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonProfileContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonProfileContract.UiAction
import com.fab.wab.merchant.designsystem.components.map.PLACE_SEARCH_DEBOUNCE_MS
import com.fab.wab.merchant.designsystem.components.map.MapPickerController
import com.fab.wab.merchant.designsystem.components.map.MapPickerDependencies
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.SalonProfileDependencies
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.SalonProfileViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

private const val CONFLICT = 409

@OptIn(ExperimentalCoroutinesApi::class)
class SalonProfileViewModelTest {

    private val salon = FakeSalon(AppResult.Success(salon()))
    private val profiles = FakeProfiles()
    private val picker = FakeFilePicker(media = listOf(PickedFile("a.jpg", byteArrayOf(1), "image/jpeg")))
    private val cropper = FakeImageCropper(PickedImage(byteArrayOf(2), "image/jpeg"))
    private val uploads = FakeUploads()
    private val permissions = FakePermissions()
    private val device = FakeDeviceLocation()

    private fun TestScope.viewModel(owner: Boolean = false) = SalonProfileViewModel(
        SalonProfileDependencies(
            salon = salon,
            profiles = profiles,
            locations = FakeLocations(),
            filePicker = picker,
            cropper = cropper,
            upload = UploadFileUseCase(uploads),
            map = MapPickerController(
                MapPickerDependencies(ReverseGeocoder { _, _ -> "Mecca St" }, FakePlaces(), device, PermissionFlow(permissions), { "ar" }),
            ),
            analytics = NoOpAnalyticsTracker,
            errorText = { "failed" },
            isOwner = flowOf(owner),
        ),
        testScope = backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    private fun TestScope.effectsOf(viewModel: SalonProfileViewModel) =
        mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }

    /** BUSINESS_DOMAIN §5.19: the owner widens a women's salon to both after confirming. */
    @Test
    fun theOwnerWidensAWomenSalonToBothAfterConfirming() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel(owner = true)
        val effects = effectsOf(viewModel)
        assertTrue(viewModel.state.first { !it.loading }.canWidenAudience)
        viewModel.onEvent(UiAction.OnWidenAudience)
        assertTrue(viewModel.state.first().widenDialog)
        viewModel.onEvent(UiAction.OnDismissWiden)
        assertFalse(viewModel.state.first().widenDialog)
        assertEquals(0, profiles.widened)
        profiles.widenResult = AppResult.Success(salon(audience = Audience.BOTH))
        viewModel.onEvent(UiAction.OnWidenAudience)
        viewModel.onEvent(UiAction.OnConfirmWiden)
        val after = viewModel.state.first()
        assertEquals(1, profiles.widened)
        assertEquals(Audience.BOTH, after.salon?.audience)
        assertFalse(after.canWidenAudience, "a BOTH salon cannot widen again")
        assertEquals(SideEffect.AudienceWidened, effects.last())
    }

    @Test
    fun wideningIsHiddenForMembersClinicsAndBothSalons() = runTest(UnconfinedTestDispatcher()) {
        val member = viewModel(owner = false)
        assertFalse(member.state.first { !it.loading }.canWidenAudience)
        member.onEvent(UiAction.OnWidenAudience)
        assertFalse(member.state.first().widenDialog)
        salon.state.value = salon(type = BusinessType.CLINIC, audience = Audience.BOTH)
        assertFalse(viewModel(owner = true).state.first { !it.loading }.canWidenAudience)
        salon.state.value = salon(audience = Audience.BOTH)
        assertFalse(viewModel(owner = true).state.first { !it.loading }.canWidenAudience)
        salon.state.value = salon(audience = Audience.MALE)
        assertTrue(viewModel(owner = true).state.first { !it.loading }.canWidenAudience)
    }

    @Test
    fun aRefusedWideningShowsTheErrorAndReloadsTheSalon() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel(owner = true)
        val effects = effectsOf(viewModel)
        viewModel.state.first { !it.loading }
        profiles.widenResult = AppResult.Error(AppError.ServerError(ErrorCode.AUDIENCE_CHANGE_NOT_ALLOWED, CONFLICT, null))
        salon.result = AppResult.Success(salon(audience = Audience.BOTH))
        val refreshes = salon.refreshes
        viewModel.onEvent(UiAction.OnWidenAudience)
        viewModel.onEvent(UiAction.OnConfirmWiden)
        assertEquals(SideEffect.ShowError("failed"), effects.last())
        assertEquals(refreshes + 1, salon.refreshes)
        val after = viewModel.state.first()
        assertFalse(after.widening)
        assertEquals(Audience.BOTH, after.salon?.audience)
    }

    @Test
    fun loadsTheSalonIntoTheFormWithCitiesAndAreas() = runTest(UnconfinedTestDispatcher()) {
        val state = viewModel().state.first { !it.loading }
        assertEquals("Lina", state.form.name)
        assertEquals(UploadStatus.Uploaded, state.cover?.status)
        assertEquals(listOf("c1", "c2"), state.cities.map { it.id })
        assertEquals(listOf("a-c1"), state.areas.map { it.id })
        assertFalse(state.dirty)
    }

    @Test
    fun savesOnlyChangesAfterValidation() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnPhone("079"))
        viewModel.onEvent(UiAction.OnSave)
        assertEquals(setOf(ProfileField.PHONE), viewModel.state.first().visibleErrors)
        assertTrue(profiles.sent.isEmpty())
        viewModel.onEvent(UiAction.OnPhone("+962 79 765 4321"))
        viewModel.onEvent(UiAction.OnDescription(""))
        viewModel.onEvent(UiAction.OnCity(1))
        assertNull(viewModel.state.first().form.areaId)
        viewModel.onEvent(UiAction.OnSave)
        val sent = profiles.sent.single()
        assertEquals("+962797654321", sent.phone)
        assertEquals(Change<String?>(null), sent.description)
        assertEquals("c2", sent.cityId)
        assertEquals(SideEffect.Saved, effects.last())
    }

    @Test
    fun coverIsPickedCroppedAndUploaded() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnPickImage(ProfileImage.COVER))
        viewModel.onEvent(UiAction.OnMedia(MediaPickAction.SourceChosen(MediaSource.LIBRARY)))
        assertEquals(ProfileImage.COVER, viewModel.state.first().crop?.target)
        viewModel.onEvent(UiAction.OnCropConfirm(CropRegion.FULL))
        val state = viewModel.state.first()
        assertNull(state.crop)
        assertEquals("SALON_COVER-key", state.form.coverKey)
        assertEquals(UploadStatus.Uploaded, state.cover?.status)
        assertEquals(listOf(CropRegion.FULL), cropper.regions)
    }

    @Test
    fun failedUploadShowsRetryAndKeepsTheOldKey() = runTest(UnconfinedTestDispatcher()) {
        uploads.fail = true
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnPickImage(ProfileImage.PROFILE))
        viewModel.onEvent(UiAction.OnMedia(MediaPickAction.SourceChosen(MediaSource.LIBRARY)))
        viewModel.onEvent(UiAction.OnCropConfirm(CropRegion.FULL))
        assertEquals(UploadStatus.Failed, viewModel.state.first().profile?.status)
        assertNull(viewModel.state.first().form.profileKey)
        assertEquals(SideEffect.ShowError("failed"), effects.last())
        uploads.fail = false
        viewModel.onEvent(UiAction.OnRetryImage(ProfileImage.PROFILE))
        assertEquals("SALON_PROFILE-key", viewModel.state.first().form.profileKey)
    }

    @Test
    fun mapPinSearchAndMyLocationThenConfirm() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnOpenMap)
        viewModel.onEvent(UiAction.OnMap(MapPickerAction.CenterChanged(LocationData(31.95, 35.91))))
        assertEquals("Mecca St", viewModel.state.first().map?.address)
        viewModel.onEvent(UiAction.OnMap(MapPickerAction.QueryChanged("mall")))
        advanceTimeBy(PLACE_SEARCH_DEBOUNCE_MS + 1)
        assertEquals(listOf("p1"), viewModel.state.first().map?.suggestions?.map { it.id })
        viewModel.onEvent(UiAction.OnMap(MapPickerAction.SuggestionPicked("p1")))
        assertEquals(LocationData(PLACE_LAT, PLACE_LNG), viewModel.state.first().map?.target)
        viewModel.onEvent(UiAction.OnMap(MapPickerAction.UseMyLocation))
        assertEquals(LocationData(32.0, 35.8), viewModel.state.first().map?.target)
        viewModel.onEvent(UiAction.OnMap(MapPickerAction.Confirm))
        val state = viewModel.state.first()
        assertNull(state.map)
        assertEquals(LocationData(32.0, 35.8), state.form.location)
        assertEquals("Mecca St", state.form.locationText)
    }

    @Test
    fun blockedLocationAsksForSettingsAndBackGuardsUnsavedChanges() = runTest(UnconfinedTestDispatcher()) {
        permissions.status = PermissionStatus.DENIED_PERMANENTLY
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnOpenMap)
        viewModel.onEvent(UiAction.OnMap(MapPickerAction.UseMyLocation))
        assertEquals(MapNotice.BLOCKED, viewModel.state.first().map?.notice)
        viewModel.onEvent(UiAction.OnCloseMap)
        viewModel.onEvent(UiAction.OnBack)
        assertEquals(SideEffect.NavigateBack, effects.last())
        viewModel.onEvent(UiAction.OnName("Lina Salon"))
        viewModel.onEvent(UiAction.OnBack)
        assertTrue(viewModel.state.first().unsavedDialog)
        viewModel.onEvent(UiAction.OnSaveAndLeave)
        assertEquals(listOf(SideEffect.Saved, SideEffect.NavigateBack), effects.takeLast(2))
    }

    @Test
    fun openInMapsHandsThePinnedPointOverAndCameraIsOffered() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnOpenMap)
        viewModel.onEvent(UiAction.OnMap(MapPickerAction.UseMyLocation))
        viewModel.onEvent(UiAction.OnMap(MapPickerAction.Confirm))
        viewModel.onEvent(UiAction.OnOpenInMaps)
        val form = viewModel.state.first().form
        assertEquals(SideEffect.OpenInMaps(32.0, 35.8, form.name), effects.last())
        viewModel.onEvent(UiAction.OnPickImage(ProfileImage.COVER))
        assertEquals(PHOTO_SOURCES, viewModel.state.first().media.sources)
        viewModel.onEvent(UiAction.OnMedia(MediaPickAction.Dismiss))
        assertTrue(viewModel.state.first().media.sources.isEmpty())
        assertNull(viewModel.state.first().crop)
    }

    @Test
    fun loadFailureShowsRetry() = runTest(UnconfinedTestDispatcher()) {
        salon.result = AppResult.Error(AppError.NetworkError("offline"))
        assertEquals("failed", viewModel().state.first { !it.loading }.error)
    }
}

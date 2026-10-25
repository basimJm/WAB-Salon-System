package com.fab.wab.merchant.feature.salon.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.location.ReverseGeocoder
import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.core.domain.upload.UploadFileUseCase
import com.fab.wab.merchant.core.ui.media.CropRegion
import com.fab.wab.merchant.core.ui.media.FakeFilePicker
import com.fab.wab.merchant.core.ui.media.FakeImageCropper
import com.fab.wab.merchant.core.ui.media.PickedFile
import com.fab.wab.merchant.core.ui.media.PickedImage
import com.fab.wab.merchant.core.ui.permission.PermissionFlow
import com.fab.wab.merchant.core.ui.permission.PermissionStatus
import com.fab.wab.merchant.designsystem.components.map.MapPickerAction
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

@OptIn(ExperimentalCoroutinesApi::class)
class SalonProfileViewModelTest {

    private val salon = FakeSalon(AppResult.Success(salon()))
    private val profiles = FakeProfiles()
    private val picker = FakeFilePicker(media = listOf(PickedFile("a.jpg", byteArrayOf(1), "image/jpeg")))
    private val cropper = FakeImageCropper(PickedImage(byteArrayOf(2), "image/jpeg"))
    private val uploads = FakeUploads()
    private val permissions = FakePermissions()
    private val device = FakeDeviceLocation()

    private fun TestScope.viewModel() = SalonProfileViewModel(
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
        ),
        testScope = backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    private fun TestScope.effectsOf(viewModel: SalonProfileViewModel) =
        mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }

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
        assertEquals(SideEffect.LocationBlocked, effects.last())
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
    fun loadFailureShowsRetry() = runTest(UnconfinedTestDispatcher()) {
        salon.result = AppResult.Error(AppError.NetworkError("offline"))
        assertEquals("failed", viewModel().state.first { !it.loading }.error)
    }
}

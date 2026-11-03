package com.fab.wab.merchant.feature.bookings.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.salon.Audience
import com.fab.wab.merchant.core.domain.salon.BusinessKind
import com.fab.wab.merchant.core.domain.salon.BusinessType
import com.fab.wab.merchant.core.domain.upload.ConfirmedUpload
import com.fab.wab.merchant.core.domain.upload.UploadProgress
import com.fab.wab.merchant.core.domain.upload.UploadPurpose
import com.fab.wab.merchant.core.ui.media.FakeFilePicker
import com.fab.wab.merchant.core.ui.media.MediaSource
import com.fab.wab.merchant.core.ui.media.PickedFile
import com.fab.wab.merchant.designsystem.components.upload.MediaPickAction
import com.fab.wab.merchant.feature.bookings.domain.model.CustomerGender
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.LookupStatus
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.NewBookingContract.SideEffect
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.NewBookingContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.NewBookingField
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.NewBookingDependencies
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.NewBookingViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class NewBookingViewModelTest {
    private val repository = FakeNewBookingRepository()
    private val bookings = FakeBookingsRepository()
    private val today = LocalDate(2026, 11, 5)
    private val uploads = mutableListOf<UploadPurpose>()
    private var kind: BusinessKind? = BusinessKind(BusinessType.SALON, Audience.FEMALE)

    private fun TestScope.viewModel(branch: String? = null) = NewBookingViewModel(
        NewBookingDependencies(
            repository = repository,
            bookings = bookings,
            locations = FakeLocations(),
            branchId = { branch },
            kind = { kind },
            today = { today },
            nowMinute = { 600 },
            zone = TimeZone.of("Asia/Amman"),
            analytics = NoOpAnalyticsTracker,
            picker = FakeFilePicker(media = listOf(PickedFile("design.jpg", ByteArray(4), "image/jpeg"))),
            upload = { _, purpose ->
                uploads += purpose
                flowOf(UploadProgress.Uploading(0f), UploadProgress.Done(ConfirmedUpload("uploads/design.jpg", null)))
            },
            errorText = { error -> (error as? AppError.ServerError)?.code?.name ?: "failed" },
        ),
        testScope = backgroundScope,
    )

    private fun TestScope.effectsOf(viewModel: NewBookingViewModel) =
        mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }

    @Test
    fun loadsServicesStaffAndDefaultCountry() = runTest(UnconfinedTestDispatcher()) {
        val state = viewModel().state.first { !it.loading }
        assertEquals("JO", state.countryCode)
        assertEquals(listOf(CUT, COLOR), state.services)
        assertEquals(listOf(SARA, LINA), state.staff)
        assertEquals(today, state.date)
        assertFalse(state.isTattoo)
        assertTrue(state.slotMinutes.all { it > 600 }, "today offers only slots still ahead")
    }

    @Test
    fun registeredNumberShowsTheFirstNameAndAsksNothingElse() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnNumber("0791234567"))
        viewModel.onEvent(UiAction.OnCheck)
        val state = viewModel.state.first()
        assertEquals("791234567", repository.lookups.single().number, "the trunk zero is dropped")
        assertEquals(LookupStatus.DONE, state.lookupStatus)
        assertTrue(state.isRegistered)
        assertFalse(state.asksName)
        assertFalse(state.asksGender)
        assertEquals("Rana", state.personName)
        assertEquals(CustomerGender.FEMALE, state.personGender)
        viewModel.onEvent(UiAction.OnNumber("0791234568"))
        assertEquals(LookupStatus.IDLE, viewModel.state.first().lookupStatus, "a changed number needs a new check")
    }

    @Test
    fun unregisteredNumberRequiresNameAndGender() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnNumber("0781112223"))
        viewModel.onEvent(UiAction.OnCheck)
        viewModel.onEvent(UiAction.OnSubmit)
        val state = viewModel.state.first()
        assertTrue(state.asksName && state.asksGender)
        assertTrue(state.showErrors)
        assertEquals(
            setOf(NewBookingField.NAME, NewBookingField.GENDER, NewBookingField.SERVICES, NewBookingField.TIME),
            state.visibleErrors,
        )
        assertTrue(repository.created.isEmpty())
        viewModel.onEvent(UiAction.OnName("Walk-in"))
        viewModel.onEvent(UiAction.OnGender(CustomerGender.MALE))
        assertFalse(NewBookingField.NAME in viewModel.state.first().errors)
        assertFalse(NewBookingField.GENDER in viewModel.state.first().errors)
    }

    @Test
    fun invalidPhoneCannotBeChecked() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnNumber("12"))
        viewModel.onEvent(UiAction.OnCheck)
        assertFalse(viewModel.state.first().canCheck)
        assertTrue(repository.lookups.isEmpty())
    }

    @Test
    fun servicesSelectionSumsDurationAndPrice() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnServiceToggle(CUT.id))
        viewModel.onEvent(UiAction.OnServiceToggle(COLOR.id))
        assertEquals(135, viewModel.state.first().totalMinutes)
        assertEquals(50_500L, viewModel.state.first().totalFils)
        viewModel.onEvent(UiAction.OnServiceToggle(CUT.id))
        assertEquals(90, viewModel.state.first().totalMinutes)
    }

    @Test
    fun datesOutsideTodayToNinetyDaysAreIgnored() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnDateSelect(LocalDate(2026, 11, 4)))
        assertEquals(today, viewModel.state.first().date)
        viewModel.onEvent(UiAction.OnDateSelect(LocalDate(2027, 2, 4)))
        assertEquals(today, viewModel.state.first().date)
        viewModel.onEvent(UiAction.OnDateSelect(LocalDate(2027, 2, 3)))
        assertEquals(LocalDate(2027, 2, 3), viewModel.state.first().date)
        assertEquals(96, viewModel.state.first().slotMinutes.size, "another day offers every slot")
    }

    @Test
    fun submitSendsTheBookingAndOpensIt() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel(branch = "b1")
        val effects = effectsOf(viewModel)
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnNumber("0791234567"))
        viewModel.onEvent(UiAction.OnCheck)
        viewModel.onEvent(UiAction.OnServiceToggle(CUT.id))
        viewModel.onEvent(UiAction.OnStaff(LINA.id))
        viewModel.onEvent(UiAction.OnDateSelect(LocalDate(2026, 11, 6)))
        viewModel.onEvent(UiAction.OnTimeSelect(14 * 60 + 30))
        viewModel.onEvent(UiAction.OnSubmit)
        val request = repository.created.single()
        assertEquals("b1", request.branchId)
        assertEquals("791234567", request.customer.phone.number)
        assertNull(request.customer.name, "a registered customer sends the phone only")
        val person = request.persons.single()
        assertEquals("Rana", person.name)
        assertEquals(listOf(CUT.id), person.serviceIds)
        assertEquals(LINA.id, person.staffId)
        assertEquals("2026-11-06T11:30:00Z", person.start.toString())
        assertNull(person.referenceImageKey)
        assertEquals(listOf<SideEffect>(SideEffect.OpenBooking("new-1")), effects)
    }

    @Test
    fun submitErrorShowsTheErrorText() = runTest(UnconfinedTestDispatcher()) {
        repository.createResult = serverError(ErrorCode.SLOT_TAKEN)
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnNumber("0781112223"))
        viewModel.onEvent(UiAction.OnCheck)
        viewModel.onEvent(UiAction.OnName("Walk-in"))
        viewModel.onEvent(UiAction.OnGender(CustomerGender.FEMALE))
        viewModel.onEvent(UiAction.OnServiceToggle(CUT.id))
        viewModel.onEvent(UiAction.OnTimeSelect(14 * 60))
        viewModel.onEvent(UiAction.OnSubmit)
        val request = repository.created.single()
        assertEquals("Walk-in", request.customer.name)
        assertEquals(CustomerGender.FEMALE, request.customer.gender)
        assertNull(request.persons.single().staffId, "any available")
        assertEquals(listOf<SideEffect>(SideEffect.ShowError("SLOT_TAKEN")), effects)
        assertFalse(viewModel.state.first().submitting)
    }

    @Test
    fun tattooStudioUploadsTheDesignAndSendsItsKey() = runTest(UnconfinedTestDispatcher()) {
        kind = BusinessKind(BusinessType.TATTOO, Audience.BOTH)
        val viewModel = viewModel()
        assertTrue(viewModel.state.first { !it.loading }.isTattoo)
        viewModel.onEvent(UiAction.OnPickDesign)
        viewModel.onEvent(UiAction.OnMedia(MediaPickAction.SourceChosen(MediaSource.LIBRARY)))
        assertEquals(listOf(UploadPurpose.BOOKING_REFERENCE), uploads)
        assertEquals("uploads/design.jpg", viewModel.state.first().designKey)
        viewModel.onEvent(UiAction.OnNumber("0791234567"))
        viewModel.onEvent(UiAction.OnCheck)
        viewModel.onEvent(UiAction.OnServiceToggle(CUT.id))
        viewModel.onEvent(UiAction.OnTimeSelect(14 * 60))
        viewModel.onEvent(UiAction.OnSubmit)
        assertEquals("uploads/design.jpg", repository.created.single().persons.single().referenceImageKey)
    }

    @Test
    fun lookupErrorKeepsTheCustomerUnchecked() = runTest(UnconfinedTestDispatcher()) {
        repository.lookupError = serverError(ErrorCode.RATE_LIMITED)
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnNumber("0791234567"))
        viewModel.onEvent(UiAction.OnCheck)
        assertEquals(LookupStatus.IDLE, viewModel.state.first().lookupStatus)
        assertEquals(listOf<SideEffect>(SideEffect.ShowError("RATE_LIMITED")), effects)
    }
}

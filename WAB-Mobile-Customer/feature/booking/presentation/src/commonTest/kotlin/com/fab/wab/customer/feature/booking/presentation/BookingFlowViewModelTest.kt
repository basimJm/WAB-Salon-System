package com.fab.wab.customer.feature.booking.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.feature.booking.domain.model.BookingDraft
import com.fab.wab.customer.feature.booking.domain.model.DraftMoney
import com.fab.wab.customer.feature.booking.domain.model.DraftPolicy
import com.fab.wab.customer.feature.booking.domain.repository.BookingDraftRepository
import com.fab.wab.customer.feature.booking.domain.usecase.CreateBookingDraftUseCase
import com.fab.wab.customer.feature.booking.domain.usecase.DeleteBookingDraftUseCase
import com.fab.wab.customer.feature.booking.domain.model.AvailabilitySlot
import com.fab.wab.customer.feature.booking.domain.model.DayAvailability
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.model.NoSlotsReason
import com.fab.wab.customer.feature.booking.domain.repository.AvailabilityRepository
import com.fab.wab.customer.feature.booking.domain.usecase.LoadAvailabilityUseCase
import kotlinx.datetime.LocalDate
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.salon.RatingSummary
import com.fab.wab.customer.core.domain.salon.ReviewsPreview
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.core.domain.salon.SalonService
import com.fab.wab.customer.core.domain.salon.StaffMember
import com.fab.wab.customer.core.domain.salon.StaffPreview
import com.fab.wab.customer.core.domain.salon.StaffStatus
import com.fab.wab.customer.feature.booking.domain.model.StaffChoice
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.SideEffect
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingStep
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingFlowDependencies
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingFlowViewModel
import com.fab.wab.customer.feature.salon.domain.repository.SalonDetailsRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

private fun service(id: String, price: String, minutes: Int) = SalonService(id, "c$id", id, null, null, price, minutes, emptyList())

private fun salon(gender: Gender) = SalonDetails(
    id = "s1", name = "Glow", gender = gender, coverUrl = null, profileImageUrl = null, description = null, locationText = null,
    location = null, phone = null, whatsapp = null, rating = RatingSummary(4f, 1), isOpenNow = true, todayHours = null, closedReason = null,
    weeklySchedule = emptyList(), upcomingClosures = emptyList(),
    staff = listOf(StaffPreview("m1", "Omar", null, StaffStatus.ON_DUTY), StaffPreview("m2", "Ali", null, StaffStatus.ON_DUTY)),
    services = listOf(service("a", "10", 30), service("b", "5.5", 15)), gallery = emptyList(), isFavorite = false,
    reviews = ReviewsPreview(RatingSummary(4f, 1), emptyList()),
)

private class SalonFake(val gender: Gender) : SalonDetailsRepository {
    override suspend fun details(salonId: String): AppResult<SalonDetails> = AppResult.Success(salon(gender))
    override suspend fun staffMember(salonId: String, memberId: String): AppResult<StaffMember> = AppResult.Loading
}

private class SessionFake(initial: SessionState) : SessionStore {
    override val state: Flow<SessionState> = MutableStateFlow(initial)
    override val onboardingSeen: Flow<Boolean> = MutableStateFlow(true)
    override val pushEnabled: Flow<Boolean> = MutableStateFlow(true)
    override suspend fun tokens(): AuthTokens? = null
    override suspend fun signIn(tokens: AuthTokens, user: UserProfile) = Unit
    override suspend fun updateTokens(tokens: AuthTokens) = Unit
    override suspend fun updateUser(user: UserProfile) = Unit
    override suspend fun setOnboardingSeen(seen: Boolean) = Unit
    override suspend fun setGuestProfile(profile: GuestProfile) = Unit
    override suspend fun setPushEnabled(enabled: Boolean) = Unit
    override suspend fun signOut() = Unit
    override suspend fun clearAll() = Unit
}

private val USER = SessionState.SignedIn(UserProfile("c1", "Sara", Gender.FEMALE))
private val TODAY = LocalDate.parse("2026-10-19")

private class DraftFake(val allowed: Set<PaymentMethod> = setOf(PaymentMethod.DEPOSIT, PaymentMethod.FULL_ONLINE)) : BookingDraftRepository {
    val created = mutableListOf<PaymentMethod>()
    val deleted = mutableListOf<String>()
    override suspend fun create(salonId: String, paymentMethod: PaymentMethod, persons: List<DraftPerson>): AppResult<BookingDraft> {
        created += paymentMethod
        if (paymentMethod !in allowed) {
            return AppResult.Error(AppError.ServerError(ErrorCode.PAYMENT_OPTION_NOT_ALLOWED, 422, null))
        }
        val policy = DraftPolicy(3.0, allowed.toList(), 20.0, false, null)
        val deposit = if (paymentMethod == PaymentMethod.DEPOSIT) "2" else "0"
        return AppResult.Success(BookingDraft("d${created.size}", salonId, "Glow", "2026-10-19T10:10:00Z", paymentMethod, emptyList(), DraftMoney("10", deposit, deposit, "8"), policy))
    }
    override suspend fun get(draftId: String): AppResult<BookingDraft> = AppResult.Loading
    override suspend fun delete(draftId: String): AppResult<Unit> {
        deleted += draftId
        return AppResult.Success(Unit)
    }
}

private class AvailabilityFake : AvailabilityRepository {
    val calls = mutableListOf<Pair<String, List<DraftPerson>>>()
    override suspend fun slots(
        salonId: String,
        date: String,
        person: DraftPerson,
        others: List<DraftPerson>,
        draftId: String?,
    ): AppResult<DayAvailability> {
        calls += date to others
        val slots = listOf(
            AvailabilitySlot("${date}T07:00:00Z", "${date}T07:45:00Z", true, listOf("m1")),
            AvailabilitySlot("${date}T07:15:00Z", "${date}T08:00:00Z", false, emptyList()),
        )
        return AppResult.Success(DayAvailability(date, NoSlotsReason.NONE, 45, slots))
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class BookingFlowViewModelTest {

    private val effects = mutableListOf<SideEffect>()
    private val availability = AvailabilityFake()
    private val drafts = DraftFake()

    private fun TestScope.viewModel(gender: Gender = Gender.FEMALE): BookingFlowViewModel {
        val deps = BookingFlowDependencies(
            salonDetails = SalonFake(gender),
            sessionStore = SessionFake(USER),
            loadAvailability = LoadAvailabilityUseCase(availability),
            createDraft = CreateBookingDraftUseCase(drafts),
            deleteDraft = DeleteBookingDraftUseCase(drafts),
            analytics = NoOpAnalyticsTracker,
            errorText = { "error" },
            today = { TODAY },
        )
        val vm = BookingFlowViewModel("s1", deps, backgroundScope)
        backgroundScope.launch { vm.state.collect {} }
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        return vm
    }

    @Test
    fun prefillsTheAccountNameAndGatesTheBrideToggleByGender() = runTest(UnconfinedTestDispatcher()) {
        val women = viewModel(Gender.FEMALE)
        assertEquals("Sara", women.state.value.person.name)
        assertTrue(women.state.value.isWomenSalon)
        women.onEvent(UiAction.OnBrideChange(true))
        assertTrue(women.state.value.person.isBride)

        val men = viewModel(Gender.MALE)
        men.onEvent(UiAction.OnBrideChange(true))
        assertFalse(men.state.value.person.isBride)
    }

    @Test
    fun nameRequiredThenServicesWithRunningTotalsAndBackKeepsSelections() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnNameChange(" "))
        vm.onEvent(UiAction.OnContinue)
        assertTrue(vm.state.value.nameError)
        assertEquals(BookingStep.PERSON, vm.state.value.step)
        vm.onEvent(UiAction.OnNameChange("Lina"))
        vm.onEvent(UiAction.OnContinue)
        assertEquals(BookingStep.SERVICES, vm.state.value.step)
        assertFalse(vm.state.value.canContinueServices)
        vm.onEvent(UiAction.OnServiceToggle("a"))
        vm.onEvent(UiAction.OnServiceToggle("b"))
        assertEquals(15_500, vm.state.value.totals.priceFils)
        assertEquals(45, vm.state.value.totals.durationMinutes)
        vm.onEvent(UiAction.OnServiceToggle("b"))
        assertEquals(listOf("a"), vm.state.value.person.serviceIds)
        vm.onEvent(UiAction.OnBack)
        assertEquals(BookingStep.PERSON, vm.state.value.step)
        assertEquals("Lina", vm.state.value.person.name)
        vm.onEvent(UiAction.OnContinue)
        assertEquals(listOf("a"), vm.state.value.person.serviceIds)
        vm.onEvent(UiAction.OnContinue)
        assertEquals(BookingStep.SLOT, vm.state.value.step)
    }

    @Test
    fun backFromTheFirstStepExits() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnBack)
        assertEquals(SideEffect.Exit, effects.last())
    }

    @Test
    fun slotStepBuildsTheCalendarLoadsSlotsAndRejectsFullOnes() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnContinue)
        vm.onEvent(UiAction.OnServiceToggle("a"))
        vm.onEvent(UiAction.OnContinue)
        assertEquals(BookingStep.SLOT, vm.state.value.step)
        assertEquals(91, vm.state.value.calendar.size)
        assertFalse(vm.state.value.canContinueSlot)
        vm.onEvent(UiAction.OnDateSelect(LocalDate.parse("2026-10-20")))
        assertEquals("2026-10-20", availability.calls.single().first)
        assertEquals(2, vm.state.value.availability?.slots?.size)
        vm.onEvent(UiAction.OnSlotSelect("2026-10-20T07:15:00Z"))
        assertFalse(vm.state.value.canContinueSlot)
        vm.onEvent(UiAction.OnSlotSelect("2026-10-20T07:00:00Z"))
        assertTrue(vm.state.value.canContinueSlot)
        assertEquals("2026-10-20", vm.state.value.person.date)
        vm.onEvent(UiAction.OnContinue)
        assertEquals(BookingStep.STAFF, vm.state.value.step)
        vm.onEvent(UiAction.OnBack)
        assertEquals(BookingStep.SLOT, vm.state.value.step)
        assertEquals(LocalDate.parse("2026-10-20"), vm.state.value.selectedDate)
        assertEquals(1, availability.calls.size)
    }

    private fun BookingFlowViewModel.reachStaffStep() {
        onEvent(UiAction.OnContinue)
        onEvent(UiAction.OnServiceToggle("a"))
        onEvent(UiAction.OnContinue)
        onEvent(UiAction.OnDateSelect(LocalDate.parse("2026-10-20")))
        onEvent(UiAction.OnSlotSelect("2026-10-20T07:00:00Z"))
        onEvent(UiAction.OnContinue)
    }

    @Test
    fun staffStepAllowsOnlyEligibleMembersOrAnyThenCompanions() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.reachStaffStep()
        assertEquals(BookingStep.STAFF, vm.state.value.step)
        assertEquals(setOf("m1"), vm.state.value.eligibleStaffIds)
        vm.onEvent(UiAction.OnStaffSelect("m2"))
        assertFalse(vm.state.value.canContinueStaff)
        vm.onEvent(UiAction.OnStaffSelect("m1"))
        assertEquals(StaffChoice.Specific("m1", "Omar"), vm.state.value.person.staff)
        vm.onEvent(UiAction.OnContinue)
        assertEquals(BookingStep.COMPANIONS, vm.state.value.step)
        vm.onEvent(UiAction.OnJustMe)
        assertEquals(BookingStep.SUMMARY, vm.state.value.step)
    }

    @Test
    fun companionRepeatsTheStepsOverlapIsBlockedAndRemovalWorks() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.reachStaffStep()
        vm.onEvent(UiAction.OnStaffSelect("m1"))
        vm.onEvent(UiAction.OnContinue)
        vm.onEvent(UiAction.OnAddCompanion)
        assertEquals(BookingStep.PERSON, vm.state.value.step)
        assertEquals(1, vm.state.value.currentPerson)
        vm.onEvent(UiAction.OnNameChange("Lina"))
        vm.reachStaffStep()
        assertEquals(2, availability.calls.size)
        assertEquals(1, availability.calls.last().second.size)
        vm.onEvent(UiAction.OnStaffSelect("m1"))
        assertTrue(vm.state.value.staffOverlapError)
        assertFalse(vm.state.value.canContinueStaff)
        vm.onEvent(UiAction.OnAnyStaffSelect)
        assertFalse(vm.state.value.staffOverlapError)
        vm.onEvent(UiAction.OnContinue)
        assertEquals(BookingStep.COMPANIONS, vm.state.value.step)
        assertEquals(0, vm.state.value.currentPerson)
        assertEquals(1, vm.state.value.companionsCount)
        vm.onEvent(UiAction.OnRemovePerson(0))
        assertEquals(2, vm.state.value.persons.size)
        vm.onEvent(UiAction.OnRemovePerson(1))
        assertEquals(1, vm.state.value.persons.size)
    }

    @Test
    fun companionLimitAndUnfinishedCompanionIsDroppedOnBack() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.reachStaffStep()
        vm.onEvent(UiAction.OnAnyStaffSelect)
        vm.onEvent(UiAction.OnContinue)
        repeat(5) {
            vm.onEvent(UiAction.OnAddCompanion)
            vm.onEvent(UiAction.OnNameChange("C$it"))
            vm.reachStaffStep()
            vm.onEvent(UiAction.OnAnyStaffSelect)
            vm.onEvent(UiAction.OnContinue)
        }
        assertEquals(5, vm.state.value.companionsCount)
        assertFalse(vm.state.value.canAddCompanion)
        vm.onEvent(UiAction.OnAddCompanion)
        assertEquals(6, vm.state.value.persons.size)
        vm.onEvent(UiAction.OnRemovePerson(5))
        vm.onEvent(UiAction.OnAddCompanion)
        assertEquals(BookingStep.PERSON, vm.state.value.step)
        vm.onEvent(UiAction.OnBack)
        assertEquals(BookingStep.COMPANIONS, vm.state.value.step)
        assertEquals(5, vm.state.value.persons.size)
    }

    @Test
    fun summaryCreatesTheDraftWithPaymentFallbackSwitchesMethodsAndReleasesOnBack() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.reachStaffStep()
        vm.onEvent(UiAction.OnAnyStaffSelect)
        vm.onEvent(UiAction.OnContinue)
        vm.onEvent(UiAction.OnJustMe)
        assertEquals(BookingStep.SUMMARY, vm.state.value.step)
        assertEquals(listOf(PaymentMethod.PAY_ON_ARRIVAL, PaymentMethod.DEPOSIT), drafts.created)
        assertEquals(PaymentMethod.DEPOSIT, vm.state.value.draft?.paymentMethod)
        assertTrue(vm.state.value.canConfirm)
        vm.onEvent(UiAction.OnPaymentMethodSelect(PaymentMethod.FULL_ONLINE))
        assertEquals(listOf("d2"), drafts.deleted)
        assertEquals(PaymentMethod.FULL_ONLINE, vm.state.value.draft?.paymentMethod)
        vm.onEvent(UiAction.OnPaymentMethodSelect(PaymentMethod.PAY_ON_ARRIVAL))
        assertEquals(3, drafts.created.size)
        vm.onEvent(UiAction.OnConfirm)
        assertEquals(SideEffect.OpenVerification("d3"), effects.last())
        vm.onEvent(UiAction.OnBack)
        assertEquals(BookingStep.COMPANIONS, vm.state.value.step)
        assertEquals(listOf("d2", "d3"), drafts.deleted)
    }
}

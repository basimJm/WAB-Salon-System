package com.fab.wab.customer.feature.booking.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.salon.RatingSummary
import com.fab.wab.customer.core.domain.salon.ReviewsPreview
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.core.domain.salon.SalonService
import com.fab.wab.customer.core.domain.salon.StaffMember
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
    weeklySchedule = emptyList(), upcomingClosures = emptyList(), staff = emptyList(),
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

@OptIn(ExperimentalCoroutinesApi::class)
class BookingFlowViewModelTest {

    private val effects = mutableListOf<SideEffect>()

    private fun TestScope.viewModel(gender: Gender = Gender.FEMALE): BookingFlowViewModel {
        val deps = BookingFlowDependencies(SalonFake(gender), SessionFake(USER), NoOpAnalyticsTracker, { "error" })
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
}

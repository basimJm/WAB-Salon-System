package com.fab.wab.customer.feature.bookings.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.core.domain.booking.BookingSummary
import com.fab.wab.customer.core.domain.booking.BookingTab
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.core.domain.booking.PaymentStatus
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.core.realtime.FakeRealtimeClient
import com.fab.wab.customer.core.realtime.RealtimeEvent
import com.fab.wab.customer.core.realtime.RealtimeEvents
import com.fab.wab.customer.feature.bookings.domain.repository.BookingsRepository
import com.fab.wab.customer.feature.bookings.domain.usecase.LoadBookingsUseCase
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingsContract.SideEffect
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingsContract.UiAction
import com.fab.wab.customer.feature.bookings.presentation.controller.vm.BookingsDependencies
import com.fab.wab.customer.feature.bookings.presentation.controller.vm.BookingsViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

private fun booking(id: String) = BookingSummary(
    id = id, referenceNumber = "WAB-$id", status = BookingStatus.PENDING, paymentMethod = PaymentMethod.DEPOSIT,
    paymentStatus = PaymentStatus.DEPOSIT_PAID, hasBride = false, appointmentStart = "2026-10-18T10:00:00Z",
    appointmentEnd = "2026-10-18T11:00:00Z", personsCount = 1, total = "20", salonId = "s1", salonName = "Glow", staffNames = emptyList(),
)

private class BookingsFake : BookingsRepository {
    val calls = mutableListOf<Triple<BookingTab, String, Int>>()
    var perPage = 10
    override suspend fun list(tab: BookingTab, query: String, page: Int, pageSize: Int): AppResult<List<BookingSummary>> {
        calls += Triple(tab, query, page)
        return AppResult.Success(List(perPage) { booking("$page-$it") })
    }
    override suspend fun details(bookingId: String): AppResult<BookingDetails> = AppResult.Loading
    override suspend fun cancel(bookingId: String, reasonText: String?): AppResult<String> = AppResult.Loading
}

private class SessionStoreFake(initial: SessionState) : SessionStore {
    val sessionState = MutableStateFlow(initial)
    override val state: Flow<SessionState> = sessionState
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

private val GUEST = SessionState.Guest(GuestProfile("Sara", Gender.FEMALE))
private val USER = SessionState.SignedIn(UserProfile("c1", "Omar", Gender.MALE))
private const val DEBOUNCE = 500L

@OptIn(ExperimentalCoroutinesApi::class)
class BookingsViewModelTest {

    private val repository = BookingsFake()
    private val realtime = FakeRealtimeClient()
    private val effects = mutableListOf<SideEffect>()

    private fun TestScope.viewModel(session: SessionState): BookingsViewModel {
        val deps = BookingsDependencies(
            LoadBookingsUseCase(repository), SessionStoreFake(session), realtime, NoOpAnalyticsTracker, { "error" }, DEBOUNCE,
        )
        val vm = BookingsViewModel(deps, backgroundScope)
        backgroundScope.launch { vm.state.collect {} }
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        return vm
    }

    @Test
    fun guestSeesTheGateAndRegisteredUserLoadsUpcoming() = runTest(UnconfinedTestDispatcher()) {
        val guest = viewModel(GUEST)
        assertEquals(false, guest.state.value.signedIn)
        assertEquals("Sara", guest.state.value.welcomeName)
        assertTrue(repository.calls.isEmpty())
        guest.onEvent(UiAction.OnLoginClick)
        assertEquals<SideEffect>(SideEffect.OpenLogin, effects.last())

        val user = viewModel(USER)
        assertEquals(Triple(BookingTab.UPCOMING, "", 1), repository.calls.single())
        assertEquals("Omar", user.state.value.welcomeName)
        user.onEvent(UiAction.OnTabSelect(BookingTab.PAST))
        assertEquals(BookingTab.PAST, repository.calls.last().first)
        user.onEvent(UiAction.OnLoadMore)
        assertEquals(2, repository.calls.last().third)
        assertEquals(20, user.state.value.bookings.size)
    }

    @Test
    fun searchIsDebouncedAndRealtimeRefreshes() = runTest {
        val vm = viewModel(USER)
        runCurrent()
        vm.onEvent(UiAction.OnQueryChange("W"))
        vm.onEvent(UiAction.OnQueryChange("WAB"))
        advanceTimeBy(DEBOUNCE + 1)
        runCurrent()
        assertEquals(2, repository.calls.size)
        assertEquals("WAB", repository.calls.last().second)
        realtime.emit(RealtimeEvent(RealtimeEvents.BOOKING_UPDATED))
        runCurrent()
        assertEquals(3, repository.calls.size)
        assertTrue(effects.none { it is SideEffect.ShowError })
    }

    @Test
    fun emptyOffersBookNow() = runTest(UnconfinedTestDispatcher()) {
        repository.perPage = 0
        val vm = viewModel(USER)
        assertTrue(vm.state.value.loaded)
        vm.onEvent(UiAction.OnBookNowClick)
        assertEquals<SideEffect>(SideEffect.OpenHome, effects.last())
    }
}

@file:Suppress("DEPRECATION") // kotlinx-datetime 0.7 deprecations on the K/N classpath until the datetime upgrade

package com.fab.wab.customer.feature.bookings.presentation

import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.core.domain.booking.BookingMoney
import com.fab.wab.customer.core.domain.booking.BookingPolicy
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.core.domain.booking.BookingSummary
import com.fab.wab.customer.core.domain.booking.BookingTab
import com.fab.wab.customer.core.domain.booking.FullPaymentRefundRule
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.core.domain.booking.PaymentStatus
import com.fab.wab.customer.core.domain.booking.RefundStatus
import com.fab.wab.customer.core.domain.salon.BranchRef
import com.fab.wab.customer.core.domain.salon.RatingSummary
import com.fab.wab.customer.core.domain.salon.ReviewsPreview
import com.fab.wab.customer.core.domain.salon.SalonBranch
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.core.domain.salon.StaffMember
import com.fab.wab.customer.core.notification.push.PushKeys
import com.fab.wab.customer.core.notification.push.PushNotification
import com.fab.wab.customer.core.notification.push.PushSignals
import com.fab.wab.customer.core.realtime.FakeRealtimeClient
import com.fab.wab.customer.core.realtime.RealtimeEvent
import com.fab.wab.customer.core.realtime.RealtimeEvents
import com.fab.wab.customer.core.ui.external.ExternalApp
import com.fab.wab.customer.core.ui.external.FakeExternalActions
import com.fab.wab.customer.feature.bookings.domain.model.CancellationRule
import com.fab.wab.customer.feature.bookings.domain.model.RefundOutcome
import com.fab.wab.customer.feature.bookings.domain.repository.BookingsRepository
import com.fab.wab.customer.feature.bookings.domain.usecase.CancelBookingUseCase
import com.fab.wab.customer.feature.bookings.domain.usecase.GetBookingDetailsUseCase
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingDetailsContract.SideEffect
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiAction
import com.fab.wab.customer.feature.bookings.presentation.controller.vm.BookingDetailsDependencies
import com.fab.wab.customer.feature.bookings.presentation.controller.vm.BookingDetailsViewModel
import com.fab.wab.customer.feature.salon.domain.repository.SalonDetailsRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.Instant
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

private val POLICY = BookingPolicy(3.0, listOf(PaymentMethod.DEPOSIT), 20.0, false, FullPaymentRefundRule.FULL, null)

private fun detailsBooking(status: BookingStatus) = BookingDetails(
    id = "b1", referenceNumber = "WAB-1", status = status, paymentMethod = PaymentMethod.DEPOSIT,
    paymentStatus = PaymentStatus.DEPOSIT_PAID, refundStatus = RefundStatus.NONE, hasBride = false,
    appointmentStart = "2026-10-20T10:00:00Z", appointmentEnd = "2026-10-20T11:00:00Z", salonId = "s1", salonName = "Glow",
    persons = emptyList(), money = BookingMoney("30", "6", "6", "24", "0"), policy = POLICY, rejection = null, cancellation = null,
)

private val SALON = SalonDetails(
    id = "s1", name = "Glow", businessType = BusinessType.SALON, audience = Audience.FEMALE, coverUrl = null, profileImageUrl = "img", description = null, locationText = null,
    location = null, phone = "+962791234567", whatsapp = null, rating = RatingSummary(4f, 1), isOpenNow = true, todayHours = null,
    closedReason = null, weeklySchedule = emptyList(), upcomingClosures = emptyList(), staff = emptyList(), services = emptyList(),
    gallery = emptyList(), isFavorite = false, reviews = ReviewsPreview(RatingSummary(4f, 1), emptyList()),
)

private class DetailsBookingsFake(var details: AppResult<BookingDetails>) : BookingsRepository {
    val detailCalls = mutableListOf<String>()
    val cancels = mutableListOf<String>()
    var cancelResult: AppResult<String> = AppResult.Success("6")
    override suspend fun list(
        tab: BookingTab,
        query: String,
        page: Int,
        pageSize: Int,
        businessType: BusinessType?,
    ): AppResult<List<BookingSummary>> = AppResult.Loading
    override suspend fun details(bookingId: String): AppResult<BookingDetails> {
        detailCalls += bookingId
        return details
    }
    override suspend fun cancel(bookingId: String, reasonText: String?): AppResult<String> {
        cancels += bookingId
        return cancelResult
    }
}

private class SalonFake : SalonDetailsRepository {
    var calls = 0
    var salon: SalonDetails = SALON
    override suspend fun details(salonId: String): AppResult<SalonDetails> {
        calls += 1
        return AppResult.Success(salon)
    }
    override suspend fun staffMember(salonId: String, memberId: String): AppResult<StaffMember> = AppResult.Loading
}

@OptIn(ExperimentalCoroutinesApi::class)
class BookingDetailsViewModelTest {

    private val realtime = FakeRealtimeClient()
    private val external = FakeExternalActions()
    private val effects = mutableListOf<SideEffect>()
    private val salons = SalonFake()

    private fun TestScope.viewModel(repository: DetailsBookingsFake, now: String = "2026-10-19T10:00:00Z"): BookingDetailsViewModel {
        val deps = BookingDetailsDependencies(
            getBookingDetails = GetBookingDetailsUseCase(repository),
            cancelBooking = CancelBookingUseCase(repository),
            salonDetails = salons,
            realtime = realtime,
            external = external,
            analytics = NoOpAnalyticsTracker,
            errorText = { "error" },
            externalText = { app -> "unavailable:$app" },
            now = { Instant.parse(now) },
        )
        val vm = BookingDetailsViewModel("b1", deps, backgroundScope)
        backgroundScope.launch { vm.state.collect {} }
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        return vm
    }

    @Test
    fun callWithoutADialerShowsTheDeviceMessage() = runTest(UnconfinedTestDispatcher()) {
        external.unavailable = setOf(ExternalApp.DIALER)
        val vm = viewModel(DetailsBookingsFake(AppResult.Success(detailsBooking(BookingStatus.APPROVED))))
        vm.onEvent(UiAction.OnCallClick)
        assertEquals(listOf<SideEffect>(SideEffect.ShowError("unavailable:DIALER")), effects)
    }

    @Test
    fun loadsBookingAndSalonContactAndComputesTheCancelRule() = runTest(UnconfinedTestDispatcher()) {
        val repository = DetailsBookingsFake(AppResult.Success(detailsBooking(BookingStatus.APPROVED)))
        val vm = viewModel(repository)
        assertEquals("+962791234567", vm.state.value.salonPhone)
        assertIs<CancellationRule.Until>(vm.state.value.cancellation)
        vm.onEvent(UiAction.OnCallClick)
        assertEquals(listOf("tel:+962791234567"), external.calls)
        realtime.emit(RealtimeEvent(RealtimeEvents.BOOKING_UPDATED))
        assertEquals(2, repository.detailCalls.size)
        assertEquals(1, salons.calls)
        val other = buildJsonObject { put("id", JsonPrimitive("b9")); put("status", JsonPrimitive("APPROVED")) }
        realtime.emit(RealtimeEvent(RealtimeEvents.BOOKING_UPDATED, other))
        assertEquals(2, repository.detailCalls.size, "another booking's update is ignored")
        val mine = buildJsonObject { put("id", JsonPrimitive("b1")); put("status", JsonPrimitive("COMPLETED")) }
        realtime.emit(RealtimeEvent(RealtimeEvents.BOOKING_UPDATED, mine))
        realtime.emit(RealtimeEvent(RealtimeEvents.BOOKING_UPDATED, mine))
        assertEquals(3, repository.detailCalls.size, "the same change delivered twice refreshes once")
        PushSignals.publishReceived(PushNotification("t", "b", mapOf(PushKeys.BOOKING_ID to "b9")))
        PushSignals.publishReceived(PushNotification("t", "b", mapOf(PushKeys.BOOKING_ID to "b1")))
        assertEquals(4, repository.detailCalls.size, "only a push about this booking refreshes")
        vm.onEvent(UiAction.OnResume)
        vm.onEvent(UiAction.OnResume)
        assertEquals(5, repository.detailCalls.size, "the first resume is the initial composition")
    }

    @Test
    fun cancelShowsTheMoneyOutcomeThenCancelsAndReloads() = runTest(UnconfinedTestDispatcher()) {
        val repository = DetailsBookingsFake(AppResult.Success(detailsBooking(BookingStatus.APPROVED)))
        val vm = viewModel(repository)
        vm.onEvent(UiAction.OnCancelClick)
        assertEquals(RefundOutcome.DEPOSIT_KEPT, vm.state.value.cancelDialog)
        vm.onEvent(UiAction.OnCancelConfirm)
        assertEquals(listOf("b1"), repository.cancels)
        assertEquals(SideEffect.Cancelled("6"), effects.last())
        assertNull(vm.state.value.cancelDialog)
        assertEquals(2, repository.detailCalls.size)
    }

    @Test
    fun windowPassedBlocksCancelAndCompletedOffersRating() = runTest(UnconfinedTestDispatcher()) {
        val late = viewModel(DetailsBookingsFake(AppResult.Success(detailsBooking(BookingStatus.APPROVED))), now = "2026-10-20T09:00:00Z")
        assertEquals(CancellationRule.WindowPassed(3.0), late.state.value.cancellation)
        late.onEvent(UiAction.OnCancelClick)
        assertNull(late.state.value.cancelDialog)

        val completed = viewModel(DetailsBookingsFake(AppResult.Success(detailsBooking(BookingStatus.COMPLETED))))
        assertEquals(CancellationRule.NotApplicable, completed.state.value.cancellation)
        completed.onEvent(UiAction.OnRateClick)
        assertEquals(SideEffect.OpenRating("b1"), effects.last())
    }

    @Test
    fun cancelFailureKeepsTheBookingAndReportsTheError() = runTest(UnconfinedTestDispatcher()) {
        val repository = DetailsBookingsFake(AppResult.Success(detailsBooking(BookingStatus.PENDING)))
        repository.cancelResult = AppResult.Error(AppError.NetworkError("offline"))
        val vm = viewModel(repository)
        vm.onEvent(UiAction.OnCancelClick)
        assertEquals(RefundOutcome.FULL_REFUND, vm.state.value.cancelDialog)
        vm.onEvent(UiAction.OnCancelConfirm)
        assertTrue(effects.last() is SideEffect.ShowError)
        assertEquals(false, vm.state.value.cancelling)
    }

    @Test
    fun callAndWhatsAppUseTheBookedBranch() = runTest(UnconfinedTestDispatcher()) {
        val khalda = SalonBranch(
            id = "b2", name = "Khalda", isMain = false, locationText = "Khalda", location = null, phone = "+962790000002",
            whatsapp = "+962790000003", isOpenNow = true, todayHours = null, closedReason = null, weeklySchedule = emptyList(),
            upcomingClosures = emptyList(),
        )
        salons.salon = SALON.copy(branches = listOf(khalda))
        val booked = detailsBooking(BookingStatus.APPROVED).copy(branch = BranchRef("b2", "Khalda", "Khalda"))
        val vm = viewModel(DetailsBookingsFake(AppResult.Success(booked)))
        assertEquals("+962790000002", vm.state.value.salonPhone)
        assertEquals("+962790000003", vm.state.value.salonWhatsApp)
        assertEquals("img", vm.state.value.salonImageUrl)
    }
}

package com.fab.wab.customer.feature.bookings.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.core.domain.booking.BookingMoney
import com.fab.wab.customer.core.domain.booking.BookingPerson
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.core.domain.booking.BookingSummary
import com.fab.wab.customer.core.domain.booking.BookingTab
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.core.domain.booking.PaymentStatus
import com.fab.wab.customer.core.domain.booking.RefundStatus
import com.fab.wab.customer.feature.bookings.domain.model.RatingStep
import com.fab.wab.customer.feature.bookings.domain.repository.BookingsRepository
import com.fab.wab.customer.feature.bookings.domain.usecase.GetBookingDetailsUseCase
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.RatingContract.SideEffect
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.RatingContract.UiAction
import com.fab.wab.customer.feature.bookings.presentation.controller.vm.RatingDependencies
import com.fab.wab.customer.feature.bookings.presentation.controller.vm.RatingViewModel
import com.fab.wab.customer.feature.salon.domain.model.ReviewDraft
import com.fab.wab.customer.feature.salon.domain.model.ReviewTarget
import com.fab.wab.customer.feature.salon.domain.model.ReviewsPage
import com.fab.wab.customer.feature.salon.domain.repository.ReviewsRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

private fun ratingPerson(staffId: String?, staffName: String?) =
    BookingPerson("Sara", false, "2026-10-18T10:00:00Z", "2026-10-18T11:00:00Z", "10", staffId, staffName, emptyList())

private fun ratingBooking(persons: List<BookingPerson>) = BookingDetails(
    id = "b1", referenceNumber = "WAB-1", status = BookingStatus.COMPLETED, paymentMethod = PaymentMethod.DEPOSIT,
    paymentStatus = PaymentStatus.DEPOSIT_PAID, refundStatus = RefundStatus.NONE, hasBride = false,
    appointmentStart = "2026-10-18T10:00:00Z", appointmentEnd = "2026-10-18T11:00:00Z", salonId = "s1", salonName = "Glow",
    persons = persons, money = BookingMoney("30", "6", "6", "24", "0"), policy = null, rejection = null, cancellation = null,
)

private class RatingBookingsFake(val details: AppResult<BookingDetails>) : BookingsRepository {
    override suspend fun list(tab: BookingTab, query: String, page: Int, pageSize: Int): AppResult<List<BookingSummary>> = AppResult.Loading
    override suspend fun details(bookingId: String): AppResult<BookingDetails> = details
    override suspend fun cancel(bookingId: String, reasonText: String?): AppResult<String> = AppResult.Loading
}

private class RatingReviewsFake : ReviewsRepository {
    val submitted = mutableListOf<Pair<ReviewTarget, ReviewDraft>>()
    var submitResult: AppResult<Unit> = AppResult.Success(Unit)
    override suspend fun list(target: ReviewTarget, page: Int, pageSize: Int): AppResult<ReviewsPage> = AppResult.Loading
    override suspend fun submit(target: ReviewTarget, draft: ReviewDraft): AppResult<Unit> {
        submitted += target to draft
        return submitResult
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class RatingViewModelTest {

    private val effects = mutableListOf<SideEffect>()
    private val reviews = RatingReviewsFake()

    private fun TestScope.viewModel(booking: AppResult<BookingDetails>): RatingViewModel {
        val deps = RatingDependencies(GetBookingDetailsUseCase(RatingBookingsFake(booking)), reviews, NoOpAnalyticsTracker, errorText = { "error" })
        val vm = RatingViewModel("b1", deps, backgroundScope)
        backgroundScope.launch { vm.state.collect {} }
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        vm.onStart()
        return vm
    }

    @Test
    fun salonThenStaffStepsSubmitAndSkipAdvanceUntilTheApprovalMessage() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(AppResult.Success(ratingBooking(listOf(ratingPerson("m1", "Lina"), ratingPerson("m2", "Dana")))))
        assertEquals(3, vm.state.value.steps.size)
        assertTrue(vm.state.value.step is RatingStep.Salon)
        vm.onEvent(UiAction.OnSubmit)
        assertTrue(reviews.submitted.isEmpty(), "no rating → nothing submitted")
        vm.onEvent(UiAction.OnRatingChange(5))
        vm.onEvent(UiAction.OnCommentChange("  great  "))
        vm.onEvent(UiAction.OnSubmit)
        assertEquals(ReviewTarget.Salon("s1") to ReviewDraft(5, "great"), reviews.submitted.single())
        assertEquals(1, vm.state.value.stepIndex)
        assertEquals(0, vm.state.value.rating)
        vm.onEvent(UiAction.OnSkip)
        assertEquals(RatingStep.Staff("s1", "m2", "Dana"), vm.state.value.step)
        vm.onEvent(UiAction.OnRatingChange(4))
        vm.onEvent(UiAction.OnSubmit)
        assertEquals(ReviewTarget.Staff("s1", "m2") to ReviewDraft(4, null), reviews.submitted.last())
        assertTrue(vm.state.value.finished)
        assertEquals(2, vm.state.value.submittedCount)
        vm.onEvent(UiAction.OnDone)
        assertEquals<SideEffect>(SideEffect.Exit, effects.single())
    }

    @Test
    fun submitFailureKeepsTheStepAndShowsAnError() = runTest(UnconfinedTestDispatcher()) {
        reviews.submitResult = AppResult.Error(AppError.NetworkError("offline"))
        val vm = viewModel(AppResult.Success(ratingBooking(listOf(ratingPerson("m1", "Lina")))))
        vm.onEvent(UiAction.OnRatingChange(3))
        vm.onEvent(UiAction.OnSubmit)
        assertEquals(0, vm.state.value.stepIndex)
        assertFalse(vm.state.value.submitting)
        assertEquals<SideEffect>(SideEffect.ShowError("error"), effects.single())
    }

    @Test
    fun anyStaffOnlyBookingHasTheSalonStepAndLoadErrorIsShown() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(AppResult.Success(ratingBooking(listOf(ratingPerson(null, null)))))
        assertEquals(listOf<RatingStep>(RatingStep.Salon("s1", "Glow")), vm.state.value.steps)
        val failed = viewModel(AppResult.Error(AppError.NetworkError("offline")))
        assertEquals("error", failed.state.value.error)
    }
}

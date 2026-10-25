package com.fab.wab.customer.feature.booking.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.OtpVerified
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.repository.PendingOtpVerification
import com.fab.wab.customer.feature.booking.domain.model.BookingDraft
import com.fab.wab.customer.feature.booking.domain.model.CreatedBooking
import com.fab.wab.customer.feature.booking.domain.model.DraftMoney
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.model.DraftPolicy
import com.fab.wab.customer.feature.booking.domain.repository.BookingDraftRepository
import com.fab.wab.customer.feature.booking.domain.usecase.CreateBookingUseCase
import com.fab.wab.customer.feature.booking.domain.usecase.GetBookingDraftUseCase
import com.fab.wab.customer.feature.booking.domain.usecase.VerifyBookingOtpUseCase
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingVerifyContract.Phase
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingVerifyContract.SideEffect
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingVerifyContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingVerifyDependencies
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingVerifyViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

private val PHONE = PhoneNumber("+962", "791234567")
private val DRAFT = BookingDraft(
    "d1", "s1", "Glow", "2026-10-19T10:10:00Z", PaymentMethod.PAY_ON_ARRIVAL, emptyList(),
    DraftMoney("10", "0", "0", "10"), DraftPolicy(3.0, listOf(PaymentMethod.PAY_ON_ARRIVAL), null, false, null),
)

private fun expired() = AppResult.Error(AppError.ServerError(ErrorCode.DRAFT_EXPIRED, 422, null))

private class VerifyRepoFake : BookingDraftRepository {
    var draft: AppResult<BookingDraft> = AppResult.Success(DRAFT)
    var verify: AppResult<String> = AppResult.Success("2026-10-19T10:05:00Z")
    var create: AppResult<CreatedBooking> = AppResult.Success(CreatedBooking("b1", "WAB-1001", "PENDING"))
    val tokens = mutableListOf<String>()
    var creates = 0
    override suspend fun create(salonId: String, branchId: String?, paymentMethod: PaymentMethod, persons: List<DraftPerson>) = draft
    override suspend fun get(draftId: String) = draft
    override suspend fun delete(draftId: String): AppResult<Unit> = AppResult.Success(Unit)
    override suspend fun verifyOtp(draftId: String, idToken: String): AppResult<String> = verify.also { tokens += idToken }
    override suspend fun createBooking(draftId: String): AppResult<CreatedBooking> = create.also { creates++ }
}

@OptIn(ExperimentalCoroutinesApi::class)
class BookingVerifyViewModelTest {

    private val repo = VerifyRepoFake()
    private val pending = PendingOtpVerification()
    private val effects = mutableListOf<SideEffect>()

    private fun TestScope.viewModel(): BookingVerifyViewModel {
        val deps = BookingVerifyDependencies(
            getDraft = GetBookingDraftUseCase(repo),
            verifyOtp = VerifyBookingOtpUseCase(repo),
            createBooking = CreateBookingUseCase(repo),
            customerPhone = { AppResult.Success(PHONE) },
            pending = pending,
            analytics = NoOpAnalyticsTracker,
            errorText = { error -> (error as? AppError.ServerError)?.code?.name ?: "error" },
        )
        val vm = BookingVerifyViewModel("d1", deps, backgroundScope)
        backgroundScope.launch { vm.state.collect {} }
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        return vm
    }

    private fun proof(purpose: AuthPurpose = AuthPurpose.BOOKING_CONFIRMATION) = OtpVerified(purpose, PHONE, "token-1")

    @Test
    fun happyPathOpensOtpThenVerifiesCreatesAndOpensSuccess() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        assertEquals(Phase.READY, vm.state.value.phase)
        assertEquals(DRAFT, vm.state.value.draft)
        vm.onEvent(UiAction.OnVerifyClick)
        assertEquals<SideEffect>(SideEffect.OpenOtp(PHONE), effects.single())
        pending.publish(proof())
        assertEquals(listOf("token-1"), repo.tokens)
        assertEquals(1, repo.creates)
        assertEquals<SideEffect>(SideEffect.OpenSuccess("b1", "WAB-1001"), effects.last())
        assertEquals(null, pending.current.value)
    }

    @Test
    fun aProofForAnotherPurposeIsIgnored() = runTest(UnconfinedTestDispatcher()) {
        viewModel()
        pending.publish(proof(AuthPurpose.CHANGE_PHONE))
        assertTrue(repo.tokens.isEmpty())
    }

    @Test
    fun expiredDraftShowsTheExpiredErrorAndRetryGoesBackToBooking() = runTest(UnconfinedTestDispatcher()) {
        repo.draft = expired()
        val vm = viewModel()
        assertEquals(Phase.ERROR, vm.state.value.phase)
        assertTrue(vm.state.value.expired)
        assertEquals("DRAFT_EXPIRED", vm.state.value.errorMessage)
        vm.onEvent(UiAction.OnRetry)
        assertEquals<SideEffect>(SideEffect.BackToBooking, effects.single())
    }

    @Test
    fun expiryDuringCreateIsAlsoReportedAsExpired() = runTest(UnconfinedTestDispatcher()) {
        repo.create = expired()
        val vm = viewModel()
        pending.publish(proof())
        assertTrue(vm.state.value.expired)
        assertFalse(effects.any { it is SideEffect.OpenSuccess })
    }

    @Test
    fun verifyOtpFailureShowsErrorAndRetryReopensOtp() = runTest(UnconfinedTestDispatcher()) {
        repo.verify = AppResult.Error(AppError.ServerError(ErrorCode.OTP_INVALID, 400, null))
        val vm = viewModel()
        pending.publish(proof())
        assertEquals(Phase.ERROR, vm.state.value.phase)
        assertFalse(vm.state.value.expired)
        assertEquals(0, repo.creates)
        vm.onEvent(UiAction.OnRetry)
        assertEquals<SideEffect>(SideEffect.OpenOtp(PHONE), effects.single())
    }

    @Test
    fun createFailureShowsErrorAndRetryCreatesWithoutAnotherOtp() = runTest(UnconfinedTestDispatcher()) {
        repo.create = AppResult.Error(AppError.NetworkError("offline"))
        val vm = viewModel()
        pending.publish(proof())
        assertEquals(Phase.ERROR, vm.state.value.phase)
        assertTrue(vm.state.value.otpVerified)
        repo.create = AppResult.Success(CreatedBooking("b2", "WAB-1002", "PENDING"))
        vm.onEvent(UiAction.OnRetry)
        assertEquals(1, repo.tokens.size)
        assertEquals(2, repo.creates)
        assertEquals<SideEffect>(SideEffect.OpenSuccess("b2", "WAB-1002"), effects.single())
    }
}

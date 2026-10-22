package com.fab.wab.customer.feature.booking.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.repository.PendingOtpVerification
import com.fab.wab.customer.feature.booking.domain.usecase.CreateBookingUseCase
import com.fab.wab.customer.feature.booking.domain.usecase.GetBookingDraftUseCase
import com.fab.wab.customer.feature.booking.domain.usecase.VerifyBookingOtpUseCase
import com.fab.wab.customer.feature.booking.presentation.analytics.BookingVerifyAnalytics
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingVerifyContract.Phase
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingVerifyContract.SideEffect
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingVerifyContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingVerifyContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.launch

class BookingVerifyDependencies(
    val getDraft: GetBookingDraftUseCase,
    val verifyOtp: VerifyBookingOtpUseCase,
    val createBooking: CreateBookingUseCase,
    /** The signed-in customer's phone (the OTP goes to their own number). */
    val customerPhone: suspend () -> AppResult<PhoneNumber>,
    val pending: PendingOtpVerification,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** S16 step 6 (CUS-077): draft → OTP (BOOKING_CONFIRMATION) → verify-otp → `POST /bookings` → S17. No online payment yet. */
class BookingVerifyViewModel(
    private val draftId: String,
    private val deps: BookingVerifyDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(UiState(), testScope) {

    private var started = false

    override fun onStart() {
        if (started) return
        started = true
        scope.launch { load() }
        scope.launch { awaitProof() }
    }

    override fun handle(event: UiAction) {
        when (event) {
            UiAction.OnVerifyClick -> scope.launch { openOtp() }
            UiAction.OnRetry -> retry()
            UiAction.OnBackToBooking -> emitSideEffect(SideEffect.BackToBooking)
        }
    }

    private fun retry() {
        val state = uiState.value
        if (state.expired) {
            emitSideEffect(SideEffect.BackToBooking)
            return
        }
        deps.analytics.trackAction(AnalyticsAction(BookingVerifyAnalytics.ACTION_RETRY))
        scope.launch {
            when {
                state.draft == null -> load()
                state.otpVerified -> create()
                else -> openOtp()
            }
        }
    }

    private suspend fun load() {
        updateState { copy(phase = Phase.LOADING, errorMessage = null, expired = false) }
        when (val result = deps.getDraft(draftId)) {
            is AppResult.Success -> updateState { copy(phase = Phase.READY, draft = result.data) }
            is AppResult.Error -> fail(result.appError)
            AppResult.Loading -> Unit
        }
    }

    private suspend fun openOtp() {
        if (uiState.value.phase == Phase.PROCESSING) return
        deps.analytics.trackAction(AnalyticsAction(BookingVerifyAnalytics.ACTION_VERIFY))
        when (val phone = deps.customerPhone()) {
            is AppResult.Success -> {
                updateState { copy(phase = Phase.READY, errorMessage = null) }
                emitSideEffect(SideEffect.OpenOtp(phone.data))
            }
            is AppResult.Error -> fail(phone.appError)
            AppResult.Loading -> Unit
        }
    }

    private suspend fun awaitProof() {
        deps.pending.current.filterNotNull().collect { proof ->
            if (proof.purpose != AuthPurpose.BOOKING_CONFIRMATION) return@collect
            deps.pending.consume()
            verify(proof.idToken)
        }
    }

    private suspend fun verify(idToken: String) {
        updateState { copy(phase = Phase.PROCESSING, errorMessage = null) }
        when (val result = deps.verifyOtp(draftId, idToken)) {
            is AppResult.Success -> {
                updateState { copy(otpVerified = true) }
                create()
            }
            is AppResult.Error -> fail(result.appError)
            AppResult.Loading -> Unit
        }
    }

    private suspend fun create() {
        updateState { copy(phase = Phase.PROCESSING, errorMessage = null) }
        when (val result = deps.createBooking(draftId)) {
            is AppResult.Success -> {
                deps.analytics.trackAction(AnalyticsAction(BookingVerifyAnalytics.ACTION_CREATED))
                emitSideEffect(SideEffect.OpenSuccess(result.data.id, result.data.referenceNumber))
            }
            is AppResult.Error -> fail(result.appError)
            AppResult.Loading -> Unit
        }
    }

    private suspend fun fail(error: AppError) {
        val expired = (error as? AppError.ServerError)?.code == ErrorCode.DRAFT_EXPIRED
        val message = deps.errorText(error)
        updateState { copy(phase = Phase.ERROR, errorMessage = message, expired = expired) }
    }
}

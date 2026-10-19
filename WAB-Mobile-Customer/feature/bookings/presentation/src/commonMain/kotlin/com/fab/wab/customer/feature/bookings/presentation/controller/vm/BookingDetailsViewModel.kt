package com.fab.wab.customer.feature.bookings.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.core.realtime.RealtimeClient
import com.fab.wab.customer.core.notification.push.PushKeys
import com.fab.wab.customer.core.notification.push.PushSignals
import com.fab.wab.customer.core.realtime.RealtimeEvents
import com.fab.wab.customer.core.realtime.RefreshReason
import com.fab.wab.customer.core.realtime.refreshesFor
import com.fab.wab.customer.core.ui.external.ExternalActions
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.bookings.domain.model.CancellationRule
import com.fab.wab.customer.feature.bookings.domain.model.cancellationRuleOf
import com.fab.wab.customer.feature.bookings.domain.model.refundOutcomeOf
import com.fab.wab.customer.feature.bookings.domain.usecase.CancelBookingUseCase
import com.fab.wab.customer.feature.bookings.domain.usecase.GetBookingDetailsUseCase
import com.fab.wab.customer.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingDetailsContract.SideEffect
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiAction
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiState
import com.fab.wab.customer.feature.salon.domain.repository.SalonDetailsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.merge
import kotlinx.coroutines.launch
import kotlinx.datetime.Instant

class BookingDetailsDependencies(
    val getBookingDetails: GetBookingDetailsUseCase,
    val cancelBooking: CancelBookingUseCase,
    val salonDetails: SalonDetailsRepository,
    val realtime: RealtimeClient,
    val external: ExternalActions,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
    val now: () -> Instant = { kotlinx.datetime.Clock.System.now() },
)

/** S15: booking + salon contact, cancel rule and money outcome from the policy snapshot, live `booking.updated`. */
class BookingDetailsViewModel(
    private val bookingId: String,
    private val deps: BookingDetailsDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private var started = false

    override fun onStart() {
        if (started) return
        started = true
        load()
        scope.launch {
            // PRD §3.15: only this booking's socket updates (de-duplicated) and FCM messages about it refresh the screen.
            merge(
                deps.realtime.events.refreshesFor(RealtimeEvents.BOOKING_UPDATED, entityId = bookingId),
                PushSignals.messages
                    .filter { it.data[PushKeys.BOOKING_ID].let { id -> id == null || id == bookingId } }
                    .map { RefreshReason.Push },
            ).collect { if (uiState.value.booking != null) load(refresh = true) }
        }
    }

    override fun handle(event: UiAction) {
        when (event) {
            UiAction.OnRetry -> load()
            UiAction.OnRefresh -> load(refresh = true)
            UiAction.OnResume -> onResume()
            UiAction.OnCallClick -> uiState.value.salonPhone?.let { deps.external.dial(it) }
            UiAction.OnWhatsAppClick -> uiState.value.salonWhatsApp?.let { deps.external.openWhatsApp(it) }
            UiAction.OnRateClick -> rate()
            UiAction.OnCancelClick -> openCancelDialog()
            UiAction.OnCancelConfirm -> cancel()
            UiAction.OnCancelDismiss -> updateState { copy(cancelDialog = null) }
        }
    }

    /** The first ON_RESUME comes with the first composition, right after the initial load. */
    private var firstResume = true

    private fun onResume() {
        if (firstResume) {
            firstResume = false
            return
        }
        if (uiState.value.booking != null) load(refresh = true)
    }

    private fun rate() {
        if (uiState.value.booking?.status == BookingStatus.COMPLETED) emitSideEffect(SideEffect.OpenRating(bookingId))
    }

    private fun load(refresh: Boolean = false) {
        scope.launch {
            updateState { copy(loading = !refresh, refreshing = refresh, error = null, offline = false) }
            when (val result = deps.getBookingDetails(bookingId)) {
                is AppResult.Success -> {
                    apply(result.data)
                    loadSalonContact(result.data)
                }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    val keep = refresh && uiState.value.booking != null
                    val offline = result.appError is AppError.NetworkError
                    updateState { copy(loading = false, refreshing = false, offline = offline, error = if (keep) null else message) }
                    if (keep) emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun apply(booking: BookingDetails) = updateState {
        copy(loading = false, refreshing = false, booking = booking, cancellation = cancellationRuleOf(booking, deps.now()))
    }

    /** The booking carries only the salon id + name; phone / WhatsApp / image come from the salon profile. */
    private suspend fun loadSalonContact(booking: BookingDetails) {
        val salonId = booking.salonId ?: return
        if (uiState.value.salonPhone != null || uiState.value.salonWhatsApp != null) return
        val salon = (deps.salonDetails.details(salonId) as? AppResult.Success)?.data ?: return
        updateState { copy(salonPhone = salon.phone, salonWhatsApp = salon.whatsapp, salonImageUrl = salon.profileImageUrl) }
    }

    private fun openCancelDialog() {
        val booking = uiState.value.booking ?: return
        val rule = uiState.value.cancellation
        if (rule is CancellationRule.NotApplicable || rule is CancellationRule.WindowPassed) return
        updateState { copy(cancelDialog = refundOutcomeOf(booking)) }
    }

    /** PRD S15: the whole booking is cancelled (no partial cancel, no rescheduling). */
    private fun cancel() {
        if (uiState.value.cancelling) return
        updateState { copy(cancelDialog = null, cancelling = true) }
        scope.launch {
            when (val result = deps.cancelBooking(bookingId)) {
                is AppResult.Success -> {
                    deps.analytics.trackAction(
                        AnalyticsAction(BookingsAnalytics.ACTION_CANCEL, analyticsParams { text(BookingsAnalytics.PARAM_ID, bookingId) }),
                    )
                    updateState { copy(cancelling = false) }
                    emitSideEffect(SideEffect.Cancelled(result.data))
                    load(refresh = true)
                }
                is AppResult.Error -> {
                    updateState { copy(cancelling = false) }
                    emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }
}

package com.fab.wab.merchant.feature.bookings.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.core.ui.alert.RequestAlert
import com.fab.wab.merchant.designsystem.components.booking.HandledBy
import com.fab.wab.merchant.designsystem.components.booking.RequestSheetDefaults
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.bookings.domain.model.BookingAction
import com.fab.wab.merchant.feature.bookings.domain.model.BookingDetails
import com.fab.wab.merchant.feature.bookings.domain.model.BookingQuery
import com.fab.wab.merchant.feature.bookings.domain.model.BookingsDefaults
import com.fab.wab.merchant.feature.bookings.domain.model.BookingsTab
import com.fab.wab.merchant.feature.bookings.domain.repository.BookingsRepository
import com.fab.wab.merchant.feature.bookings.domain.usecase.ActionFailure
import com.fab.wab.merchant.feature.bookings.domain.usecase.failure
import com.fab.wab.merchant.feature.bookings.domain.usecase.isReasonValid
import com.fab.wab.merchant.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.ActionMessage
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingRequestsContract.SideEffect
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingRequestsContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingRequestsContract.UiState
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.DetailsDialog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch

class BookingRequestsDependencies(
    val repository: BookingsRepository,
    /** Booking ids of new requests: socket `booking.requested` + FCM data messages (duplicates expected). */
    val requests: Flow<String>,
    /** Booking ids whose summary changed (`booking.updated`): a queued request may have been handled elsewhere. */
    val updates: Flow<String>,
    val clock: Flow<Long>,
    val alert: RequestAlert,
    val analytics: AnalyticsTracker,
    /** Name shown when the server does not say who handled the request. */
    val anotherMember: suspend () -> String,
    val errorText: suspend (AppError) -> String = ::appErrorText,
    /** `request_shown` channel (PRD §14): in-app sheet, Android overlay or notification. */
    val channel: String = BookingsAnalytics.CHANNEL_IN_APP,
)

/** PRD M10: de-duplicated by booking id, queued ("1 of 3"), accept / reject in place, "handled by" then dismiss. */
class BookingRequestsViewModel(
    private val deps: BookingRequestsDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    /** Every id already queued or answered here: a repeated socket event or push never re-opens it. */
    private val seen = mutableSetOf<String>()

    /** The request on screen and when it appeared, for `request_shown` (once each) and the response time. */
    private var shownId: String? = null
    private var shownAtMs = 0L

    override fun onStart() {
        deps.requests.onEach { enqueue(it) }.launchIn(scope)
        deps.updates.onEach { recheck(it) }.launchIn(scope)
        deps.clock.onEach { now -> updateState { copy(nowMs = now) } }.launchIn(scope)
        // Opening the app shows the unanswered requests (PRD M10, iOS).
        scope.launch {
            val pending = deps.repository.list(BookingQuery(BookingsTab.PENDING), BookingsDefaults.FIRST_PAGE, BookingsDefaults.PAGE_SIZE)
            (pending as? AppResult.Success)?.data?.forEach { enqueue(it.id) }
        }
    }

    override fun handle(event: UiAction) {
        handleSheet(event) || handleReason(event)
    }

    private fun handleSheet(event: UiAction): Boolean {
        when (event) {
            UiAction.OnAccept -> accept()
            UiAction.OnReject -> if (canAct()) updateState { copy(reject = DetailsDialog.Reason(BookingAction.REJECT)) }
            UiAction.OnViewDetails -> uiState.value.current?.let { open(it.summary.id) }
            UiAction.OnNext, UiAction.OnDone -> {
                updateState { copy(acceptedReference = null, acceptedId = null) }
                alertForCurrent()
            }
            UiAction.OnViewBooking -> uiState.value.acceptedId?.let { id ->
                updateState { copy(acceptedReference = null, acceptedId = null) }
                alertForCurrent()
                emitSideEffect(SideEffect.OpenDetails(id))
            }
            UiAction.OnDismiss -> uiState.value.current?.let { drop(it.summary.id) }
            else -> return false
        }
        return true
    }

    private fun handleReason(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnReasonSelect -> updateState { copy(reject = reject?.copy(selected = event.reason)) }
            is UiAction.OnReasonText -> updateState {
                copy(reject = reject?.copy(text = event.value.take(BookingsDefaults.REASON_TEXT_MAX)))
            }
            UiAction.OnRejectConfirm -> reject()
            UiAction.OnRejectDismiss -> updateState { copy(reject = null) }
            else -> return false
        }
        return true
    }

    private fun canAct(): Boolean = uiState.value.let { it.current != null && !it.accepting && !it.rejecting && it.handledBy == null }

    private suspend fun enqueue(id: String) {
        if (!seen.add(id)) return
        val details = (deps.repository.details(id) as? AppResult.Success)?.data
        if (details == null || details.summary.status != BookingStatus.PENDING) return
        val wasEmpty = uiState.value.queue.isEmpty()
        updateState { copy(queue = queue + details) }
        if (wasEmpty) alertForCurrent()
    }

    private suspend fun recheck(id: String) {
        val queued = uiState.value.queue.any { it.summary.id == id }
        if (!queued) return
        val details = (deps.repository.details(id) as? AppResult.Success)?.data ?: return
        if (details.summary.status == BookingStatus.PENDING) return
        if (uiState.value.current?.summary?.id == id) {
            handledElsewhere(id, deps.anotherMember(), details.summary.status)
        } else {
            updateState { copy(queue = queue.filterNot { it.summary.id == id }) }
        }
    }

    private fun accept() {
        val current = uiState.value.current ?: return
        if (!canAct()) return
        deps.alert.stop()
        scope.launch {
            updateState { copy(accepting = true) }
            val result = deps.repository.approve(current.summary.id)
            updateState { copy(accepting = false) }
            when (result.failure()?.first) {
                null -> {
                    deps.analytics.trackAction(sheetAction(BookingsAnalytics.ACTION_ACCEPT))
                    updateState {
                        copy(queue = queue.drop(1), acceptedReference = current.summary.reference, acceptedId = current.summary.id)
                    }
                }
                else -> answerFailed(current.summary.id, result)
            }
        }
    }

    private fun reject() {
        val current = uiState.value.current ?: return
        val dialog = uiState.value.reject ?: return
        val reason = dialog.selected
        if (reason == null || !isReasonValid(reason, dialog.text, BookingsDefaults.REASON_TEXT_MAX) || uiState.value.rejecting) return
        deps.alert.stop()
        scope.launch {
            updateState { copy(rejecting = true) }
            val result = deps.repository.reject(current.summary.id, reason, dialog.text.takeIf { it.isNotBlank() })
            updateState { copy(rejecting = false, reject = null) }
            if (result.failure() == null) {
                deps.analytics.trackAction(sheetAction(BookingsAnalytics.ACTION_REJECT, reason.name))
                emitSideEffect(SideEffect.ShowMessage(ActionMessage.REJECTED))
                drop(current.summary.id)
            } else {
                answerFailed(current.summary.id, result)
            }
        }
    }

    /** Conflict-safe (CLAUDE.md §8.2): handled elsewhere → "handled by"; conflict → leave the queue; other → stays pending. */
    private suspend fun answerFailed(id: String, result: AppResult<Unit>) {
        val (kind, error) = result.failure() ?: return
        when (kind) {
            // The contract names no member, so the sheet says "another team member".
            ActionFailure.ALREADY_HANDLED -> handledElsewhere(id, deps.anotherMember(), null)
            ActionFailure.CONFLICT -> {
                emitSideEffect(SideEffect.ShowError(deps.errorText(error)))
                drop(id)
            }
            ActionFailure.OTHER -> emitSideEffect(SideEffect.ShowError(deps.errorText(error)))
        }
    }

    private fun handledElsewhere(id: String, name: String, outcome: BookingStatus?) {
        deps.alert.stop()
        updateState { copy(handledBy = HandledBy(name, outcome), reject = null) }
        scope.launch {
            delay(RequestSheetDefaults.HANDLED_DISMISS_MS)
            updateState { copy(handledBy = null) }
            drop(id)
        }
    }

    private fun open(id: String) {
        drop(id)
        emitSideEffect(SideEffect.OpenDetails(id))
    }

    private fun drop(id: String) {
        val wasCurrent = uiState.value.current?.summary?.id == id
        updateState { copy(queue = queue.filterNot { it.summary.id == id }) }
        if (wasCurrent) alertForCurrent()
    }

    /** Distinct sound / vibration while a request is on screen; silent once the queue is empty. */
    private fun alertForCurrent() {
        val state = uiState.value
        val current = state.current
        if (current != null && state.acceptedReference == null) {
            deps.alert.play()
            trackShown(current)
        } else {
            deps.alert.stop()
        }
    }

    private fun trackShown(current: BookingDetails) {
        if (shownId == current.summary.id) return
        shownId = current.summary.id
        shownAtMs = uiState.value.nowMs
        deps.analytics.trackAction(
            AnalyticsAction(
                BookingsAnalytics.ACTION_SHOWN,
                analyticsParams {
                    text(BookingsAnalytics.PARAM_CHANNEL, deps.channel)
                    flag(BookingsAnalytics.PARAM_BRIDE, current.summary.hasBride)
                },
            ),
        )
    }

    /** Whole seconds from the sheet showing the request to the answer; null before the clock has ticked. */
    private fun responseSeconds(): Long? {
        val now = uiState.value.nowMs
        return if (shownAtMs > 0L && now >= shownAtMs) (now - shownAtMs) / MILLIS_PER_SECOND else null
    }

    private fun sheetAction(name: String, reason: String? = null) = AnalyticsAction(
        name,
        analyticsParams {
            text(BookingsAnalytics.PARAM_SOURCE, BookingsAnalytics.SOURCE_SHEET)
            reason?.let { text(BookingsAnalytics.PARAM_REASON, it) }
            responseSeconds()?.let { number(BookingsAnalytics.PARAM_RESPONSE_SECONDS, it) }
        },
    )
}

private const val MILLIS_PER_SECOND = 1_000L

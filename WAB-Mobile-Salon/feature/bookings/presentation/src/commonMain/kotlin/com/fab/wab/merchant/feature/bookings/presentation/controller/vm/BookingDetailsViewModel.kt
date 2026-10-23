package com.fab.wab.merchant.feature.bookings.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.bookings.domain.model.BookingAction
import com.fab.wab.merchant.feature.bookings.domain.model.BookingsDefaults
import com.fab.wab.merchant.feature.bookings.domain.repository.BookingsRepository
import com.fab.wab.merchant.feature.bookings.domain.usecase.ActionFailure
import com.fab.wab.merchant.feature.bookings.domain.usecase.failure
import com.fab.wab.merchant.feature.bookings.domain.usecase.isReasonValid
import com.fab.wab.merchant.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.ActionMessage
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingDetailsContract.SideEffect
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiState
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.DetailsDialog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch

/** PRD M09: details, actions by status and permission (server `actions`), conflict-safe (CLAUDE.md §8.2). */
class BookingDetailsViewModel(
    private val bookingId: String,
    private val repository: BookingsRepository,
    private val changes: Flow<Unit>,
    private val clock: Flow<Long>,
    private val analytics: AnalyticsTracker,
    private val errorText: suspend (AppError) -> String = ::appErrorText,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    override fun onStart() {
        changes.onEach { load(refresh = true) }.launchIn(scope)
        clock.onEach { now -> updateState { copy(nowMs = now) } }.launchIn(scope)
        load(refresh = false)
    }

    override fun handle(event: UiAction) {
        handleActions(event) || handleDialogs(event) || handleContact(event)
    }

    private fun handleActions(event: UiAction): Boolean {
        when (event) {
            UiAction.OnRefresh -> load(refresh = true)
            UiAction.OnRetry -> load(refresh = false)
            is UiAction.OnActionClick -> open(event.action)
            else -> return false
        }
        return true
    }

    private fun handleDialogs(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnReasonSelect -> editReason { copy(selected = event.reason) }
            is UiAction.OnReasonText -> editReason { copy(text = event.value.take(BookingsDefaults.REASON_TEXT_MAX)) }
            is UiAction.OnReassignPerson -> editReassign { copy(personIndex = event.index) }
            is UiAction.OnReassignStaff -> editReassign { copy(staffId = event.staffId) }
            UiAction.OnDialogConfirm -> confirm()
            UiAction.OnDialogDismiss -> updateState { copy(dialog = null) }
            else -> return false
        }
        return true
    }

    private fun handleContact(event: UiAction): Boolean {
        when (event) {
            UiAction.OnCallCustomer -> uiState.value.details?.summary?.customerPhone?.let { emitSideEffect(SideEffect.Dial(it)) }
            UiAction.OnWhatsAppCustomer -> uiState.value.details?.summary?.customerPhone?.let { emitSideEffect(SideEffect.WhatsApp(it)) }
            UiAction.OnCopyReference -> uiState.value.details?.summary?.reference?.let { emitSideEffect(SideEffect.CopyReference(it)) }
            else -> return false
        }
        return true
    }

    private fun editReason(change: DetailsDialog.Reason.() -> DetailsDialog.Reason) =
        updateState { copy(dialog = (dialog as? DetailsDialog.Reason)?.change() ?: dialog) }

    private fun editReassign(change: DetailsDialog.Reassign.() -> DetailsDialog.Reassign) =
        updateState { copy(dialog = (dialog as? DetailsDialog.Reassign)?.change() ?: dialog) }

    private fun open(action: BookingAction) {
        if (action == BookingAction.APPROVE) {
            run(action) { repository.approve(bookingId) }
            return
        }
        val dialog = when (action) {
            BookingAction.REJECT, BookingAction.CANCEL -> DetailsDialog.Reason(action)
            BookingAction.COMPLETE, BookingAction.NO_SHOW -> DetailsDialog.Confirm(action)
            else -> DetailsDialog.Reassign().also { loadStaff() }
        }
        updateState { copy(dialog = dialog) }
    }

    private fun confirm() {
        when (val dialog = uiState.value.dialog) {
            is DetailsDialog.Reason -> {
                val reason = dialog.selected
                if (reason == null || !isReasonValid(reason, dialog.text, BookingsDefaults.REASON_TEXT_MAX)) return
                val text = dialog.text.takeIf { it.isNotBlank() }
                run(dialog.action, reason.name) {
                    if (dialog.action == BookingAction.REJECT) repository.reject(
                        bookingId,
                        reason,
                        text,
                    ) else repository.cancel(bookingId, reason, text)
                }
            }
            is DetailsDialog.Confirm -> run(dialog.action) {
                if (dialog.action == BookingAction.COMPLETE) repository.complete(bookingId) else repository.noShow(bookingId)
            }
            is DetailsDialog.Reassign -> {
                val staffId = dialog.staffId ?: return
                run(BookingAction.REASSIGN) { repository.reassign(bookingId, dialog.personIndex, staffId) }
            }
            DetailsDialog.AlreadyHandled, null -> updateState { copy(dialog = null) }
        }
    }

    private fun run(action: BookingAction, reason: String? = null, call: suspend () -> AppResult<Unit>) {
        if (uiState.value.acting != null) return
        scope.launch {
            updateState { copy(acting = action) }
            val result = call()
            updateState { copy(acting = null) }
            val failure = result.failure()
            if (failure == null) {
                updateState { copy(dialog = null) }
                track(action, reason)
                emitSideEffect(SideEffect.ShowMessage(messageOf(action)))
                load(refresh = true)
                return@launch
            }
            when (failure.first) {
                ActionFailure.ALREADY_HANDLED -> updateState { copy(dialog = DetailsDialog.AlreadyHandled) }
                ActionFailure.CONFLICT -> updateState { copy(dialog = null) }
                ActionFailure.OTHER -> Unit
            }
            emitSideEffect(SideEffect.ShowError(errorText(failure.second)))
            // A conflict means the booking moved on the server: refresh instead of retrying (CLAUDE.md §8.2).
            if (failure.first != ActionFailure.OTHER) load(refresh = true)
        }
    }

    private fun loadStaff() {
        if (uiState.value.staffOptions.isNotEmpty()) return
        scope.launch { (repository.staff() as? AppResult.Success)?.let { staff -> updateState { copy(staffOptions = staff.data) } } }
    }

    private fun load(refresh: Boolean) {
        scope.launch {
            updateState { if (refresh) copy(refreshing = true) else copy(loading = true, error = null) }
            when (val result = repository.details(bookingId)) {
                is AppResult.Success -> updateState { copy(loading = false, refreshing = false, details = result.data, error = null) }
                is AppResult.Error -> {
                    val message = errorText(result.appError)
                    val keep = uiState.value.details != null
                    updateState { copy(loading = false, refreshing = false, error = if (keep) null else message) }
                    if (keep) emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun track(action: BookingAction, reason: String?) {
        val name = when (action) {
            BookingAction.APPROVE -> BookingsAnalytics.ACTION_ACCEPT
            BookingAction.REJECT -> BookingsAnalytics.ACTION_REJECT
            BookingAction.CANCEL -> BookingsAnalytics.ACTION_CANCEL
            BookingAction.COMPLETE -> BookingsAnalytics.ACTION_COMPLETE
            BookingAction.NO_SHOW -> BookingsAnalytics.ACTION_NO_SHOW
            BookingAction.REASSIGN -> BookingsAnalytics.ACTION_REASSIGN
        }
        analytics.trackAction(AnalyticsAction(name, analyticsParams { reason?.let { text(BookingsAnalytics.PARAM_REASON, it) } }))
    }

    private fun messageOf(action: BookingAction): ActionMessage = when (action) {
        BookingAction.APPROVE -> ActionMessage.APPROVED
        BookingAction.REJECT -> ActionMessage.REJECTED
        BookingAction.CANCEL -> ActionMessage.CANCELLED
        BookingAction.COMPLETE -> ActionMessage.COMPLETED
        BookingAction.NO_SHOW -> ActionMessage.NO_SHOW
        BookingAction.REASSIGN -> ActionMessage.REASSIGNED
    }
}

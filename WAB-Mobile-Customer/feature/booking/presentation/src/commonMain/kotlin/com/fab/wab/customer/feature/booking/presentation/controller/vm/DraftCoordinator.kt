package com.fab.wab.customer.feature.booking.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.feature.booking.presentation.analytics.BookingAnalytics
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * Step 5 (PRD S16): the server draft snapshots prices + policy and holds the slots for 10 minutes. The salon's
 * payment options are only known from the draft, so an unsupported method falls back to the next preferred one.
 */
internal class DraftCoordinator(
    private val deps: BookingFlowDependencies,
    private val scope: () -> CoroutineScope,
    private val state: () -> UiState,
    private val update: (UiState.() -> UiState) -> Unit,
) {
    fun create(method: PaymentMethod, remaining: List<PaymentMethod> = PAYMENT_PREFERENCE.filter { it in ENABLED_METHODS } - method) {
        val current = state()
        val salon = current.salon ?: return
        scope().launch {
            update { copy(draftLoading = true, draftError = null) }
            when (val result = deps.createDraft(salon.id, method, current.persons)) {
                is AppResult.Success -> update { copy(draftLoading = false, draft = result.data) }
                is AppResult.Error -> {
                    val notAllowed = (result.appError as? AppError.ServerError)?.code == ErrorCode.PAYMENT_OPTION_NOT_ALLOWED
                    if (notAllowed && remaining.isNotEmpty()) {
                        create(remaining.first(), remaining.drop(1))
                    } else {
                        val message = deps.errorText(result.appError)
                        update { copy(draftLoading = false, draftError = message) }
                    }
                }
                AppResult.Loading -> Unit
            }
        }
    }

    /** Changing the method re-creates the draft so the server recomputes deposit / due amounts. */
    fun changePaymentMethod(method: PaymentMethod) {
        val current = state().draft ?: return
        if (current.paymentMethod == method || method !in current.policy.paymentOptions || method !in ENABLED_METHODS) return
        val params = analyticsParams { text(BookingAnalytics.PARAM_VALUE, method.code.lowercase()) }
        deps.analytics.trackAction(AnalyticsAction(BookingAnalytics.ACTION_PAYMENT_METHOD, params))
        scope().launch {
            update { copy(draftLoading = true, draftError = null) }
            deps.deleteDraft(current.id)
            update { copy(draft = null) }
            create(method, emptyList())
        }
    }

    /** Leaving the summary releases the slot holds (`DELETE /bookings/drafts/{id}`). */
    fun release() {
        val draft = state().draft ?: return
        update { copy(draft = null, draftError = null) }
        scope().launch { deps.deleteDraft(draft.id) }
    }

    companion object {
        /** Fallback order when the salon does not allow the preferred method (PRD S16 step 5 options). */
        val PAYMENT_PREFERENCE = listOf(PaymentMethod.PAY_ON_ARRIVAL, PaymentMethod.DEPOSIT, PaymentMethod.FULL_ONLINE)

        /** Online payment is not live yet (CUS-047 ← PAY-011): only pay on arrival can be chosen; online options show as disabled. */
        val ENABLED_METHODS = setOf(PaymentMethod.PAY_ON_ARRIVAL)
    }
}

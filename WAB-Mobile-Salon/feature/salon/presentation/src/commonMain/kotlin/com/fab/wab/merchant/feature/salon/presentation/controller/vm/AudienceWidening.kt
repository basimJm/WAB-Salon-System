package com.fab.wab.merchant.feature.salon.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonProfileContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonProfileContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonProfileContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * Owner-only "Serve both men and women" of M13 (BUSINESS_DOMAIN §5.19): confirm, `PATCH /salon/audience` BOTH, show the
 * reloaded salon. `AUDIENCE_CHANGE_NOT_ALLOWED` (already BOTH, a clinic, or changed by WAB meanwhile) reloads the salon.
 */
internal class AudienceWidening(
    private val deps: SalonProfileDependencies,
    private val scope: CoroutineScope,
    private val state: () -> UiState,
    private val update: (UiState.() -> UiState) -> Unit,
    private val emit: (SideEffect) -> Unit,
) {
    fun handle(event: UiAction): Boolean {
        when (event) {
            UiAction.OnWidenAudience -> if (state().canWidenAudience) update { copy(widenDialog = true) }
            UiAction.OnDismissWiden -> update { copy(widenDialog = false) }
            UiAction.OnConfirmWiden -> confirm()
            else -> return false
        }
        return true
    }

    private fun confirm() {
        if (state().widening || !state().canWidenAudience) return
        update { copy(widenDialog = false, widening = true) }
        scope.launch {
            when (val result = deps.profiles.widenAudience()) {
                is AppResult.Success -> {
                    deps.analytics.trackAction(AnalyticsAction(SalonAnalytics.ACTION_AUDIENCE_WIDEN))
                    update { copy(widening = false, salon = result.data) }
                    emit(SideEffect.AudienceWidened)
                }
                is AppResult.Error -> fail(result.appError)
                AppResult.Loading -> update { copy(widening = false) }
            }
        }
    }

    private suspend fun fail(error: AppError) {
        emit(SideEffect.ShowError(deps.errorText(error)))
        val refused = (error as? AppError.ServerError)?.code == ErrorCode.AUDIENCE_CHANGE_NOT_ALLOWED
        val fresh = if (refused) (deps.salon.refresh() as? AppResult.Success)?.data else null
        update { copy(widening = false, salon = fresh ?: salon) }
    }
}

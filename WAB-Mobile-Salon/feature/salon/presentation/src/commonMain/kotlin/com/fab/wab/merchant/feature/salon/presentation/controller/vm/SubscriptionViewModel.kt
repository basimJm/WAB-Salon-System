package com.fab.wab.merchant.feature.salon.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.config.AppConfigRepository
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.salon.domain.SubscriptionRepository
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SubscriptionContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SubscriptionContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SubscriptionContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch

/** PRD M23: salon state, trial / active / expired with days left, paid outside the app, Contact WAB, get featured. */
class SubscriptionViewModel(
    private val repository: SubscriptionRepository,
    private val config: AppConfigRepository,
    private val analytics: AnalyticsTracker,
    private val errorText: suspend (AppError) -> String = ::appErrorText,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    override fun onStart() {
        config.current.onEach { value -> updateState { copy(contact = value?.contact) } }.launchIn(scope)
        load(refresh = false)
    }

    override fun handle(event: UiAction) {
        val contact = uiState.value.contact
        when (event) {
            is UiAction.OnContact -> {
                analytics.trackAction(AnalyticsAction(
                    SalonAnalytics.ACTION_CONTACT_WAB,
                    analyticsParams { text(SalonAnalytics.PARAM_REASON, event.reason.name) },
                ))
                updateState { copy(contactSheet = event.reason) }
            }
            UiAction.OnDismissContact -> updateState { copy(contactSheet = null) }
            UiAction.OnCall -> contact?.phone?.takeIf { it.isNotBlank() }?.let { emitSideEffect(SideEffect.Dial(it)) }
            UiAction.OnWhatsApp -> contact?.whatsapp?.takeIf { it.isNotBlank() }?.let { emitSideEffect(SideEffect.WhatsApp(it)) }
            UiAction.OnEmail -> contact?.email?.takeIf { it.isNotBlank() }?.let { emitSideEffect(SideEffect.Email(it)) }
            UiAction.OnRefresh -> load(refresh = true)
            UiAction.OnRetry -> load(refresh = false)
        }
    }

    private fun load(refresh: Boolean) {
        scope.launch {
            updateState { if (refresh) copy(refreshing = true) else copy(loading = true, error = null) }
            when (val result = repository.subscription()) {
                is AppResult.Success -> updateState { copy(loading = false, refreshing = false, subscription = result.data, error = null) }
                is AppResult.Error -> {
                    val message = errorText(result.appError)
                    val keep = uiState.value.subscription != null
                    updateState { copy(loading = false, refreshing = false, error = if (keep) null else message) }
                    if (keep) emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }
}

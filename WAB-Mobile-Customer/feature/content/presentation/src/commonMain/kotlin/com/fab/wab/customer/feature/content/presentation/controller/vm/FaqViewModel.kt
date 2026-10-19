package com.fab.wab.customer.feature.content.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.content.domain.usecase.LoadFaqsUseCase
import com.fab.wab.customer.feature.content.presentation.analytics.ContentAnalytics
import com.fab.wab.customer.feature.content.presentation.controller.contract.FaqContract.UiAction
import com.fab.wab.customer.feature.content.presentation.controller.contract.FaqContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

class FaqDependencies(
    val loadFaqs: LoadFaqsUseCase,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** S23 FAQ: one request, questions expand independently. */
class FaqViewModel(
    private val deps: FaqDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, Nothing>(initialState = UiState(), testScope) {

    private var started = false

    override fun onStart() {
        if (started) return
        started = true
        load()
    }

    override fun onEvent(event: UiAction) {
        when (event) {
            UiAction.OnRetry -> load()
            is UiAction.OnToggle -> {
                deps.analytics.trackAction(AnalyticsAction(ContentAnalytics.ACTION_FAQ_TOGGLE, analyticsParams { text(ContentAnalytics.PARAM_ID, event.id) }))
                updateState { copy(expanded = if (event.id in expanded) expanded - event.id else expanded + event.id) }
            }
        }
    }

    private fun load() {
        scope.launch {
            updateState { copy(loading = true, error = null, offline = false) }
            when (val result = deps.loadFaqs()) {
                is AppResult.Success -> updateState { copy(loading = false, items = result.data) }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    updateState { copy(loading = false, offline = result.appError is AppError.NetworkError, error = message) }
                }
                AppResult.Loading -> Unit
            }
        }
    }
}

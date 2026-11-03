package com.fab.wab.customer.feature.salons.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.salon.ServiceRef
import com.fab.wab.customer.feature.salons.domain.model.SearchSuggestions
import com.fab.wab.customer.feature.salons.presentation.analytics.SalonsAnalytics
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.SideEffect
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/**
 * S04 search aids (BUSINESS_DOMAIN §5.22): typed suggestions (Services then Places), recent searches kept on the device,
 * keyboard submit. [search] sets the search text the list loads with.
 */
internal class SearchAssistCoordinator(
    private val deps: AllSalonsDependencies,
    private val scope: () -> CoroutineScope,
    private val state: () -> UiState,
    private val update: (UiState.() -> UiState) -> Unit,
    private val effect: (SideEffect) -> Unit,
    private val search: (String) -> Unit,
) {
    private var suggestionsJob: Job? = null

    /** True when [event] is a search-aid action and was handled. */
    fun handle(event: UiAction): Boolean {
        when (event) {
            UiAction.OnSearchSubmit -> submit(state().text, fromRecent = false)
            is UiAction.OnRecentClick -> submit(event.text, fromRecent = true)
            UiAction.OnRecentClear -> scope().launch { deps.recentSearches.clear() }
            is UiAction.OnSuggestedServiceClick -> {
                track(event.service.id)
                saveRecent(event.service.name)
                val service = ServiceRef(event.service.id, event.service.name)
                update { copy(suggesting = false, filters = filters.withService(service)) }
                search("")
            }
            is UiAction.OnSuggestedPlaceClick -> {
                track(event.salonId)
                saveRecent(state().text)
                effect(SideEffect.OpenSalon(event.salonId))
            }
            else -> return false
        }
        return true
    }

    /** One request per settled text; a failure shows no suggestions (the list has its own error state). */
    fun loadSuggestions(text: String) {
        suggestionsJob?.cancel()
        suggestionsJob = scope().launch {
            when (val result = deps.suggestions(text, state().filters)) {
                is AppResult.Success -> update { copy(suggestions = result.data) }
                is AppResult.Error -> update { copy(suggestions = SearchSuggestions.NONE) }
                AppResult.Loading -> Unit
            }
        }
    }

    /** Submit (keyboard search or a recent search): hides the suggestions, keeps the text on the device, shows results. */
    private fun submit(text: String, fromRecent: Boolean) {
        val trimmed = text.trim()
        update { copy(suggesting = false) }
        saveRecent(trimmed)
        if (fromRecent) search(trimmed)
    }

    private fun saveRecent(text: String) {
        if (text.isBlank()) return
        scope().launch { deps.recentSearches.add(text) }
    }

    private fun track(id: String) {
        deps.analytics.trackAction(
            AnalyticsAction(SalonsAnalytics.ACTION_SUGGESTION, analyticsParams { text(SalonsAnalytics.PARAM_ID, id) }),
        )
    }
}

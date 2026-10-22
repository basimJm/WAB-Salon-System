package com.fab.wab.customer.feature.salons.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.catalog.CatalogDefaults
import com.fab.wab.customer.core.domain.catalog.CatalogService
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.salons.domain.usecase.LoadFilterServicesUseCase
import com.fab.wab.customer.feature.salons.presentation.analytics.SalonsAnalytics
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllServicesContract.SideEffect
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllServicesContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllServicesContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/** S06: the catalog of the Home tab's gender, paged by 10, expandable cards; a tap opens S04 for that service. */
class AllServicesViewModel(
    private val gender: Gender,
    private val loadServices: LoadFilterServicesUseCase,
    private val analytics: AnalyticsTracker,
    private val errorText: suspend (AppError) -> String = ::appErrorText,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private var started = false

    override fun onStart() {
        if (started) return
        started = true
        load()
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnServiceClick -> open(event.serviceId)
            UiAction.OnLoadMore -> loadMore()
            UiAction.OnRefresh -> load(refresh = true)
            UiAction.OnRetry -> load()
        }
    }

    private fun open(serviceId: String) {
        val service = uiState.value.services.firstOrNull { it.id == serviceId } ?: return
        analytics.trackAction(
            AnalyticsAction(SalonsAnalytics.ACTION_SERVICE_CLICK, analyticsParams { text(SalonsAnalytics.PARAM_ID, serviceId) }),
        )
        emitSideEffect(SideEffect.OpenSalons(service.id, service.name))
    }

    private fun load(refresh: Boolean = false) {
        scope.launch {
            updateState { copy(loading = !refresh, refreshing = refresh, error = null, offline = false) }
            when (val result = loadServices(gender, CatalogDefaults.FIRST_PAGE)) {
                is AppResult.Success -> updateState {
                    copy(loading = false, refreshing = false, loaded = true, services = result.data, hasMore = result.data.isFull())
                }
                is AppResult.Error -> {
                    val message = errorText(result.appError)
                    val keep = refresh && uiState.value.loaded
                    val offline = result.appError is AppError.NetworkError
                    updateState { copy(loading = false, refreshing = false, offline = offline, error = if (keep) null else message) }
                    if (keep) emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun loadMore() {
        val current = uiState.value
        if (current.loadingMore || !current.hasMore || current.loading) return
        scope.launch {
            updateState { copy(loadingMore = true) }
            val page = current.services.size / CatalogDefaults.PAGE_SIZE + CatalogDefaults.FIRST_PAGE
            when (val result = loadServices(gender, page)) {
                is AppResult.Success -> updateState {
                    copy(loadingMore = false, services = services + result.data, hasMore = result.data.isFull())
                }
                is AppResult.Error -> {
                    updateState { copy(loadingMore = false) }
                    emitSideEffect(SideEffect.ShowError(errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun List<CatalogService>.isFull(): Boolean = size >= CatalogDefaults.PAGE_SIZE
}

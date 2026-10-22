package com.fab.wab.merchant.feature.salon.presentation.controller.vm

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.salon.SalonGenderType
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.salon.domain.ServiceLimits
import com.fab.wab.merchant.feature.salon.domain.ServicesRepository
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.CatalogPickerContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.CatalogPickerContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.CatalogPickerContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

private const val FIRST_PAGE = 1

/** PRD M16 "Add from catalog": the salon's gender only, paged, already-added services marked (tap → edit). */
class CatalogPickerViewModel(
    private val services: ServicesRepository,
    private val salon: SalonRepository,
    private val errorText: suspend (AppError) -> String = ::appErrorText,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private var page = FIRST_PAGE
    private var gender: SalonGenderType? = null

    override fun onStart() {
        load()
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnQuery -> updateState { copy(query = event.value) }
            is UiAction.OnItemClick -> {
                val existing = uiState.value.added[event.id]
                emitSideEffect(if (existing != null) SideEffect.OpenExisting(existing) else SideEffect.OpenNew(event.id))
            }
            UiAction.OnLoadMore -> loadMore()
            UiAction.OnRequest -> emitSideEffect(SideEffect.OpenRequests)
            UiAction.OnRetry -> load()
        }
    }

    private fun load() {
        scope.launch {
            updateState { copy(loading = true, error = null) }
            val type = gender ?: salonGender() ?: return@launch
            gender = type
            (services.services() as? AppResult.Success)?.let { mine -> updateState { copy(added = mine.data.associate { it.catalogId to it.id }) } }
            page = FIRST_PAGE
            when (val result = services.catalog(type, page)) {
                is AppResult.Success -> updateState {
                    copy(loading = false, womenSalon = type == SalonGenderType.FEMALE, items = result.data, hasMore = result.data.size >= ServiceLimits.PAGE_SIZE)
                }
                is AppResult.Error -> fail(result.appError)
                AppResult.Loading -> Unit
            }
        }
    }

    private suspend fun salonGender(): SalonGenderType? {
        salon.current.value?.let { return it.gender }
        return when (val result = salon.refresh()) {
            is AppResult.Success -> result.data.gender
            is AppResult.Error -> {
                fail(result.appError)
                null
            }
            AppResult.Loading -> null
        }
    }

    private suspend fun fail(error: AppError) {
        val message = errorText(error)
        updateState { copy(loading = false, error = message) }
    }

    private fun loadMore() {
        val state = uiState.value
        val type = gender ?: return
        if (!state.hasMore || state.loadingMore || state.loading) return
        scope.launch {
            updateState { copy(loadingMore = true) }
            when (val result = services.catalog(type, page + 1)) {
                is AppResult.Success -> {
                    page += 1
                    updateState { copy(loadingMore = false, items = (items + result.data).distinctBy { it.id }, hasMore = result.data.size >= ServiceLimits.PAGE_SIZE) }
                }
                is AppResult.Error -> {
                    updateState { copy(loadingMore = false) }
                    emitSideEffect(SideEffect.ShowError(errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }
}

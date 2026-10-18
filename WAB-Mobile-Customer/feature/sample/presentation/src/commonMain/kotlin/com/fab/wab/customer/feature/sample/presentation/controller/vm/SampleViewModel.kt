package com.fab.wab.customer.feature.sample.presentation.controller.vm

import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.feature.sample.domain.usecase.GetSampleItemsUseCase
import com.fab.wab.customer.feature.sample.presentation.controller.contract.SampleContract.SideEffect
import com.fab.wab.customer.feature.sample.presentation.controller.contract.SampleContract.UiAction
import com.fab.wab.customer.feature.sample.presentation.controller.contract.SampleContract.UiState
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class SampleViewModel(
    private val getSampleItemsUseCase: GetSampleItemsUseCase,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState()) {

    override fun onStart() {
        loadItems()
    }

    override fun onEvent(event: UiAction) {
        when (event) {
            UiAction.OnRefresh -> loadItems()
            is UiAction.OnItemClicked -> Unit
        }
    }

    private fun loadItems() {
        scope.launch {
            getSampleItemsUseCase().collectLatest { result ->
                when (result) {
                    is AppResult.Loading ->
                        updateState { copy(isLoading = true, errorMessage = null) }

                    is AppResult.Success ->
                        updateState { copy(isLoading = false, items = result.data) }

                    is AppResult.Error -> {
                        val message = result.appError.displayMessage()
                        updateState { copy(isLoading = false, errorMessage = message) }
                        emitSideEffect(SideEffect.ShowMessage(message))
                    }
                }
            }
        }
    }
}

private fun AppError.displayMessage(): String = when (this) {
    is AppError.NetworkError -> errorMsg
    is AppError.UnknownError -> errorMsg
    is AppError.HttpError -> message ?: "Request failed"
    is AppError.ParseError -> message ?: "Could not read the response"
}

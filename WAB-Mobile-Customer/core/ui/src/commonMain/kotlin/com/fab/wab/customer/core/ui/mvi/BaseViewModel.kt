package com.fab.wab.customer.core.ui.mvi

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn

abstract class BaseViewModel<UiState, UiEvent, SideEffect>(
    initialState: UiState,
    private val testScope: CoroutineScope? = null,
) : ViewModel(), MVI<UiState, UiEvent, SideEffect> by mvi(initialState) {

    protected val scope: CoroutineScope get() = testScope ?: viewModelScope

    val state: StateFlow<UiState> = uiState
        .onStart {
            onStart()
        }
        .stateIn(
            scope = scope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = initialState,
        )

    fun emitSideEffect(effect: SideEffect) {
        scope.emitSideEffect(effect)
    }

    open fun onStart() {}
}

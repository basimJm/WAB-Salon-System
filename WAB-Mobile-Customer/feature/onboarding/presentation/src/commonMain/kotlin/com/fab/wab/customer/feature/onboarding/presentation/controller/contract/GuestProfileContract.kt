package com.fab.wab.customer.feature.onboarding.presentation.controller.contract

import com.fab.wab.customer.core.domain.session.Gender

sealed interface GuestProfileContract {
    /** S02 states: empty (Continue disabled), nickname error, filled (Continue enabled). */
    data class UiState(
        val nickname: String = "",
        val gender: Gender? = null,
        val nicknameError: Boolean = false,
        val saving: Boolean = false,
    ) {
        val canContinue: Boolean get() = nickname.isNotBlank() && gender != null && !saving
    }

    sealed interface UiAction {
        data class OnNicknameChange(val value: String) : UiAction
        data class OnGenderSelect(val gender: Gender) : UiAction
        data object OnContinueClick : UiAction
    }

    sealed interface SideEffect {
        data object Saved : SideEffect
    }
}

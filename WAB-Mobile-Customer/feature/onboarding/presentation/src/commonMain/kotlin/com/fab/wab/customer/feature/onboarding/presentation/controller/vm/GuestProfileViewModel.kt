package com.fab.wab.customer.feature.onboarding.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.common.FormValidators
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.feature.onboarding.domain.usecase.SaveGuestProfileUseCase
import com.fab.wab.customer.feature.onboarding.presentation.analytics.GuestProfileAnalytics
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.GuestProfileContract.SideEffect
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.GuestProfileContract.UiAction
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.GuestProfileContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

class GuestProfileViewModel(
    private val saveGuestProfile: SaveGuestProfileUseCase,
    private val analytics: AnalyticsTracker,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    override fun onEvent(event: UiAction) {
        when (event) {
            is UiAction.OnNicknameChange -> updateState { copy(nickname = event.value, nicknameError = false) }
            is UiAction.OnGenderSelect -> updateState { copy(gender = event.gender) }
            UiAction.OnContinueClick -> save()
        }
    }

    private fun save() {
        val current = state.value
        val gender = current.gender
        if (!FormValidators.isRequiredText(current.nickname)) {
            updateState { copy(nicknameError = true) }
            return
        }
        if (gender == null || current.saving) return
        scope.launch {
            updateState { copy(saving = true) }
            saveGuestProfile(current.nickname, gender)
            analytics.trackAction(
                AnalyticsAction(
                    GuestProfileAnalytics.ACTION_SAVED,
                    analyticsParams { text(GuestProfileAnalytics.PARAM_GENDER, gender.code.lowercase()) },
                ),
            )
            updateState { copy(saving = false) }
            emitSideEffect(SideEffect.Saved)
        }
    }
}

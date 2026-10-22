package com.fab.wab.customer.feature.salon.presentation.controller.vm

import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.salon.domain.usecase.GetStaffMemberUseCase
import com.fab.wab.customer.feature.salon.presentation.controller.contract.StaffSheetContract.SideEffect
import com.fab.wab.customer.feature.salon.presentation.controller.contract.StaffSheetContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.controller.contract.StaffSheetContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/** S07a: one request per opening; reviews "See all" / "Add review" (auth-gated) hand off to S09 (CUS-038). */
class StaffSheetViewModel(
    private val salonId: String,
    private val memberId: String,
    private val getStaffMember: GetStaffMemberUseCase,
    private val sessionStore: SessionStore,
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
            UiAction.OnRetry -> load()
            UiAction.OnAllReviewsClick -> emitSideEffect(SideEffect.OpenReviews(salonId, memberId))
            UiAction.OnAddReviewClick -> addReview()
            UiAction.OnDialogConfirm -> {
                updateState { copy(authDialog = false) }
                emitSideEffect(SideEffect.OpenLogin)
            }
            UiAction.OnDialogDismiss -> updateState { copy(authDialog = false) }
        }
    }

    private fun addReview() {
        if (uiState.value.signedIn) emitSideEffect(SideEffect.OpenAddReview(salonId, memberId)) else updateState { copy(authDialog = true) }
    }

    private fun load() {
        scope.launch {
            val signedIn = sessionStore.state.first().isSignedIn
            updateState { copy(loading = true, error = null, offline = false, signedIn = signedIn) }
            when (val result = getStaffMember(salonId, memberId)) {
                is AppResult.Success -> updateState { copy(loading = false, member = result.data) }
                is AppResult.Error -> {
                    val message = errorText(result.appError)
                    val offline = result.appError is AppError.NetworkError
                    updateState { copy(loading = false, offline = offline, error = message) }
                }
                AppResult.Loading -> Unit
            }
        }
    }
}

package com.fab.wab.customer.feature.booking.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.booking.domain.model.BookingFlowDefaults
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.presentation.analytics.BookingAnalytics
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.SideEffect
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingStep
import com.fab.wab.customer.feature.salon.domain.repository.SalonDetailsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class BookingFlowDependencies(
    val salonDetails: SalonDetailsRepository,
    val sessionStore: SessionStore,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/**
 * S16 steps 0–1 (CUS-043): one view model owns the whole draft so Back keeps every selection;
 * later steps (slot, staff, companions, summary) plug into the same state (CUS-044…046).
 */
class BookingFlowViewModel(
    private val salonId: String,
    private val deps: BookingFlowDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private var started = false

    override fun onStart() {
        if (started) return
        started = true
        load()
    }

    override fun onEvent(event: UiAction) {
        when (event) {
            UiAction.OnRetry -> load()
            is UiAction.OnNameChange -> updatePerson { copy(name = event.value.take(BookingFlowDefaults.MAX_NAME_LENGTH)) }
                .also { updateState { copy(nameError = false) } }
            is UiAction.OnBrideChange -> if (uiState.value.isWomenSalon) updatePerson { copy(isBride = event.isBride) }
            is UiAction.OnServiceToggle -> toggleService(event.serviceId)
            UiAction.OnContinue -> next()
            UiAction.OnBack -> back()
        }
    }

    private fun load() {
        scope.launch {
            updateState { copy(loading = true, error = null, offline = false) }
            val session = deps.sessionStore.state.first()
            val accountName = (session as? SessionState.SignedIn)?.user?.firstName.orEmpty()
            when (val result = deps.salonDetails.details(salonId)) {
                is AppResult.Success -> updateState {
                    val prefilled = persons.mapIndexed { index, p -> if (index == 0 && p.name.isBlank()) p.copy(name = accountName) else p }
                    copy(loading = false, salon = result.data, persons = prefilled)
                }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    val offline = result.appError is AppError.NetworkError
                    updateState { copy(loading = false, offline = offline, error = message) }
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun updatePerson(transform: DraftPerson.() -> DraftPerson) = updateState {
        copy(persons = persons.mapIndexed { index, p -> if (index == currentPerson) p.transform() else p })
    }

    /** Multi-select (PRD S16 step 1); the selection is per person. */
    private fun toggleService(serviceId: String) {
        val selected = uiState.value.person.serviceIds
        val next = if (serviceId in selected) selected - serviceId else selected + serviceId
        val selectedNow = (serviceId in next).toString()
        track(BookingAnalytics.ACTION_SERVICE_TOGGLE, BookingAnalytics.PARAM_ID to serviceId, BookingAnalytics.PARAM_VALUE to selectedNow)
        updatePerson { copy(serviceIds = next) }
    }

    private fun next() {
        val state = uiState.value
        when (state.step) {
            BookingStep.PERSON -> if (state.canContinuePerson) go(BookingStep.SERVICES) else updateState { copy(nameError = true) }
            BookingStep.SERVICES -> if (state.canContinueServices) go(BookingStep.SLOT)
            else -> Unit
        }
    }

    /** Back preserves selections (PRD S16); from the first step the flow exits. */
    private fun back() {
        val previous = BookingStep.entries.getOrNull(uiState.value.step.ordinal - 1)
        if (previous == null) emitSideEffect(SideEffect.Exit) else go(previous)
    }

    private fun go(step: BookingStep) {
        track(BookingAnalytics.ACTION_STEP, BookingAnalytics.PARAM_STEP to step.name.lowercase())
        updateState { copy(step = step) }
    }

    private fun track(action: String, vararg params: Pair<String, String>) {
        deps.analytics.trackAction(AnalyticsAction(action, analyticsParams { params.forEach { (k, v) -> text(k, v) } }))
    }
}

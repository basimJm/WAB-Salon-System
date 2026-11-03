package com.fab.wab.customer.feature.booking.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.core.ui.media.ImagePicker
import com.fab.wab.customer.core.ui.media.PickResult
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.designsystem.components.feedback.pickProblemText
import com.fab.wab.customer.feature.booking.domain.model.BookingFlowDefaults
import com.fab.wab.customer.core.common.BusinessTime
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.model.StaffChoice
import com.fab.wab.customer.feature.booking.domain.model.hasStaffOverlap
import com.fab.wab.customer.feature.booking.domain.model.selectionTotalsOf
import com.fab.wab.customer.feature.booking.domain.model.withBride
import com.fab.wab.customer.feature.booking.domain.model.withGender
import com.fab.wab.customer.feature.booking.domain.usecase.CreateBookingDraftUseCase
import com.fab.wab.customer.feature.booking.domain.usecase.DeleteBookingDraftUseCase
import com.fab.wab.customer.feature.booking.domain.usecase.LoadAvailabilityUseCase
import com.fab.wab.customer.feature.booking.domain.usecase.UploadReferenceImageUseCase
import com.fab.wab.customer.feature.booking.presentation.analytics.BookingAnalytics
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.SideEffect
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingStep
import com.fab.wab.customer.feature.salon.domain.repository.SalonDetailsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.datetime.LocalDate
import kotlinx.datetime.toLocalDateTime

class BookingFlowDependencies(
    val salonDetails: SalonDetailsRepository,
    val sessionStore: SessionStore,
    val loadAvailability: LoadAvailabilityUseCase,
    val createDraft: CreateBookingDraftUseCase,
    val deleteDraft: DeleteBookingDraftUseCase,
    val analytics: AnalyticsTracker,
    /** Tattoo design image (§5.23): the gallery picker and the `BOOKING_REFERENCE` upload. */
    val imagePicker: ImagePicker,
    val uploadReference: UploadReferenceImageUseCase,
    val errorText: suspend (AppError) -> String = ::appErrorText,
    val pickText: suspend (PickResult) -> String? = ::pickProblemText,
    val today: () -> LocalDate = { BusinessTime.nowInstant().toLocalDateTime(BusinessTime.zone).date },
)

/**
 * S16 steps 0–5 (CUS-043…046): one view model owns the whole draft so Back keeps every selection;
 * verification + payment (step 6) is a separate screen (CUS-047).
 */
class BookingFlowViewModel(
    private val salonId: String,
    private val deps: BookingFlowDependencies,
    private val initialBranchId: String? = null,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private var started = false
    private val drafts = DraftCoordinator(deps, { scope }, { uiState.value }, ::updateState)
    private val references = ReferenceImageCoordinator(deps, { scope }, { uiState.value }, ::updateState, ::emitSideEffect)
    private val calendar = CalendarCoordinator(salonId, deps, { scope }, { uiState.value }, ::updateState, ::updatePerson)

    override fun onStart() {
        if (started) return
        started = true
        load()
    }

    override fun handle(event: UiAction) {
        if (!handlePersonAndServices(event) && !handleSchedule(event)) handleFlow(event)
    }

    private fun handlePersonAndServices(event: UiAction): Boolean {
        when (event) {
            UiAction.OnRetry -> load()
            is UiAction.OnBranchSelect -> selectBranch(event.branchId)
            is UiAction.OnNameChange -> updatePerson { copy(name = event.value.take(BookingFlowDefaults.MAX_NAME_LENGTH)) }
                .also { updateState { copy(nameError = false) } }
            is UiAction.OnBrideChange -> if (uiState.value.showsBride) {
                updatePerson { withBride(event.isBride, uiState.value.salon?.services.orEmpty()) }
            }
            // BOTH salons and clinics only (§5.19): each person's gender.
            is UiAction.OnGenderChange -> if (uiState.value.asksGender) {
                track(BookingAnalytics.ACTION_GENDER, BookingAnalytics.PARAM_VALUE to event.gender.code.lowercase())
                updatePerson { withGender(event.gender, uiState.value.salon?.services.orEmpty()) }
                updateState { copy(genderError = false) }
            }
            is UiAction.OnServiceToggle -> toggleService(event.serviceId)
            UiAction.OnReferencePick -> references.pick()
            UiAction.OnReferenceRemove -> references.remove()
            else -> return false
        }
        return true
    }

    private fun handleSchedule(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnMonthChange -> calendar.changeMonth(event.delta)
            is UiAction.OnDateSelect -> calendar.selectDate(event.date)
            is UiAction.OnSlotSelect -> calendar.selectSlot(event.start)
            UiAction.OnAnyStaffSelect -> selectAnyStaff()
            is UiAction.OnStaffSelect -> selectStaff(event.staffId)
            else -> return false
        }
        return true
    }

    private fun handleFlow(event: UiAction) {
        when (event) {
            UiAction.OnJustMe -> go(BookingStep.SUMMARY)
            UiAction.OnAddCompanion -> addCompanion()
            is UiAction.OnRemovePerson -> removePerson(event.index)
            is UiAction.OnPaymentMethodSelect -> drafts.changePaymentMethod(event.method)
            UiAction.OnConfirm -> uiState.value.draft?.let { emitSideEffect(SideEffect.OpenVerification(it.id)) }
            UiAction.OnContinue -> next()
            UiAction.OnBack -> back()
            else -> Unit
        }
    }

    private fun load() {
        scope.launch {
            updateState { copy(loading = true, error = null, offline = false) }
            val session = deps.sessionStore.state.first()
            val accountName = (session as? SessionState.SignedIn)?.user?.firstName.orEmpty()
            when (val result = deps.salonDetails.details(salonId)) {
                is AppResult.Success -> updateState {
                    val locked = result.data.lockedGender
                    val prefilled = persons.mapIndexed { index, p ->
                        val named = if (index == 0 && p.name.isBlank()) p.copy(name = accountName) else p
                        // §5.19: the salon's gender when it is fixed; else the customer's own gender for the main person.
                        named.copy(gender = locked ?: named.gender ?: session.genderScope.takeIf { index == 0 })
                    }
                    copy(loading = false, persons = prefilled).withLoadedSalon(result.data, initialBranchId)
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

    private fun selectBranch(branchId: String) {
        if (uiState.value.fullSalon?.branches.orEmpty().none { it.id == branchId }) return
        track(BookingAnalytics.ACTION_BRANCH, BookingAnalytics.PARAM_ID to branchId)
        updateState { withBranch(branchId) }
    }

    private fun updatePerson(transform: DraftPerson.() -> DraftPerson) = updateState { withPerson(currentPerson, transform) }

    /** Multi-select (PRD S16 step 1); the selection is per person. */
    private fun toggleService(serviceId: String) {
        val state = uiState.value
        if (state.offeredServices.none { it.id == serviceId }) return
        val selected = state.person.serviceIds
        val next = if (serviceId in selected) selected - serviceId else selected + serviceId
        val selectedNow = (serviceId in next).toString()
        track(BookingAnalytics.ACTION_SERVICE_TOGGLE, BookingAnalytics.PARAM_ID to serviceId, BookingAnalytics.PARAM_VALUE to selectedNow)
        updatePerson { copy(serviceIds = next) }
    }

    private fun next() {
        val state = uiState.value
        when (state.step) {
            BookingStep.BRANCH -> if (state.canContinueBranch) go(BookingStep.PERSON)
            BookingStep.PERSON -> if (state.canContinuePerson) {
                go(BookingStep.SERVICES)
            } else {
                updateState { copy(nameError = state.person.name.isBlank(), genderError = state.personGender == null) }
            }
            BookingStep.SERVICES -> if (state.canContinueServices) go(BookingStep.SLOT)
            BookingStep.SLOT -> if (state.canContinueSlot) go(BookingStep.STAFF)
            BookingStep.STAFF -> if (state.canContinueStaff) finishPerson()
            else -> Unit
        }
    }

    /**
     * Back preserves selections (PRD S16); from the first step (branch, or person for one branch) the flow exits;
     * a companion's Back leads to the companions list.
     */
    private fun back() {
        val state = uiState.value
        when {
            state.isCompanionFlow && state.step == BookingStep.PERSON -> dropUnfinishedCompanion()
            state.step == BookingStep.COMPANIONS -> {
                updateState { copy(currentPerson = 0) }
                go(BookingStep.STAFF)
            }
            state.step == BookingStep.SUMMARY -> {
                drafts.release()
                go(BookingStep.COMPANIONS)
            }
            else -> {
                val previous = state.steps.getOrNull(state.stepIndex - 1)
                if (previous == null) emitSideEffect(SideEffect.Exit) else go(previous)
            }
        }
    }

    private fun selectAnyStaff() {
        updateState { copy(staffOverlapError = false) }
        updatePerson { copy(staff = StaffChoice.Any) }
    }

    /** Step 3 (PRD S16): a specific staff member must be eligible for the slot and free of overlaps inside the draft. */
    private fun selectStaff(staffId: String) {
        val state = uiState.value
        if (staffId !in state.eligibleStaffIds) return
        val member = state.salon?.staff?.firstOrNull { it.id == staffId } ?: return
        val start = state.person.start ?: return
        val duration = state.availability?.durationMinutes ?: state.totals.durationMinutes
        val overlap = hasStaffOverlap(state.persons, state.currentPerson, staffId, start, duration) { other ->
            selectionTotalsOf(state.salon.services, other.serviceIds).durationMinutes
        }
        if (overlap) {
            updateState { copy(staffOverlapError = true) }
            return
        }
        updateState { copy(staffOverlapError = false) }
        updatePerson { copy(staff = StaffChoice.Specific(member.id, member.firstName)) }
    }

    /** After step 3: the main person goes to the companions prompt; a companion returns to the companions list. */
    private fun finishPerson() {
        if (uiState.value.isCompanionFlow) updateState { copy(currentPerson = 0) }
        go(BookingStep.COMPANIONS)
    }

    /** Step 4 (PRD S16): up to 5 companions, each repeating steps 0–3; the salon's gender, or chosen per companion (§5.19). */
    private fun addCompanion() {
        if (!uiState.value.canAddCompanion) return
        val companion = DraftPerson(gender = uiState.value.lockedGender)
        updateState {
            copy(persons = persons + companion, genderError = false, currentPerson = persons.size, availability = null, selectedDate = null)
        }
        go(BookingStep.PERSON)
    }

    private fun removePerson(index: Int) {
        if (index == 0 || index !in uiState.value.persons.indices) return
        updateState { copy(persons = persons.filterIndexed { i, _ -> i != index }, currentPerson = 0) }
    }

    private fun dropUnfinishedCompanion() {
        val state = uiState.value
        val unfinished = state.person.staff == null
        updateState {
            copy(persons = if (unfinished) persons.filterIndexed { i, _ -> i != state.currentPerson } else persons, currentPerson = 0)
        }
        go(BookingStep.COMPANIONS)
    }

    private fun go(step: BookingStep) {
        track(BookingAnalytics.ACTION_STEP, BookingAnalytics.PARAM_STEP to step.name.lowercase())
        updateState { copy(step = step) }
        when (step) {
            BookingStep.SLOT -> calendar.prepare()
            BookingStep.SUMMARY -> drafts.create(uiState.value.draft?.paymentMethod ?: DraftCoordinator.PAYMENT_PREFERENCE.first())
            else -> Unit
        }
    }

    private fun track(action: String, vararg params: Pair<String, String>) {
        deps.analytics.trackAction(AnalyticsAction(action, analyticsParams { params.forEach { (k, v) -> text(k, v) } }))
    }
}

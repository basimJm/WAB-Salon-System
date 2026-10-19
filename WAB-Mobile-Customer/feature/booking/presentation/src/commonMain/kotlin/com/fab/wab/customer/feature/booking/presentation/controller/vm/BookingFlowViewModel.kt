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
import com.fab.wab.customer.core.common.BusinessTime
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.model.StaffChoice
import com.fab.wab.customer.feature.booking.domain.model.hasStaffOverlap
import com.fab.wab.customer.feature.booking.domain.model.selectionTotalsOf
import com.fab.wab.customer.feature.booking.domain.model.calendarDaysOf
import com.fab.wab.customer.feature.booking.domain.usecase.LoadAvailabilityUseCase
import com.fab.wab.customer.feature.booking.presentation.analytics.BookingAnalytics
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.SideEffect
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingStep
import com.fab.wab.customer.feature.salon.domain.repository.SalonDetailsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

class BookingFlowDependencies(
    val salonDetails: SalonDetailsRepository,
    val sessionStore: SessionStore,
    val loadAvailability: LoadAvailabilityUseCase,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
    val today: () -> LocalDate = { Clock.System.now().toLocalDateTime(TimeZone.of(BusinessTime.ZONE_ID)).date },
)

/**
 * S16 steps 0–2 (CUS-043/044): one view model owns the whole draft so Back keeps every selection;
 * staff, companions and summary plug into the same state (CUS-045/046).
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
            is UiAction.OnMonthChange -> changeMonth(event.delta)
            is UiAction.OnDateSelect -> selectDate(event.date)
            is UiAction.OnSlotSelect -> selectSlot(event.start)
            UiAction.OnAnyStaffSelect -> selectAnyStaff()
            is UiAction.OnStaffSelect -> selectStaff(event.staffId)
            UiAction.OnJustMe -> go(BookingStep.SUMMARY)
            UiAction.OnAddCompanion -> addCompanion()
            is UiAction.OnRemovePerson -> removePerson(event.index)
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
            BookingStep.SLOT -> if (state.canContinueSlot) go(BookingStep.STAFF)
            BookingStep.STAFF -> if (state.canContinueStaff) finishPerson()
            else -> Unit
        }
    }

    /** Back preserves selections (PRD S16); from the first step the flow exits; a companion's Back leads to the companions list. */
    private fun back() {
        val state = uiState.value
        when {
            state.isCompanionFlow && state.step == BookingStep.PERSON -> dropUnfinishedCompanion()
            state.step == BookingStep.COMPANIONS -> {
                updateState { copy(currentPerson = 0) }
                go(BookingStep.STAFF)
            }
            state.step == BookingStep.SUMMARY -> go(BookingStep.COMPANIONS)
            else -> {
                val previous = BookingStep.entries.getOrNull(state.step.ordinal - 1)
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

    /** Step 4 (PRD S16): up to 5 companions, each repeating steps 0–3; same gender as the salon by construction. */
    private fun addCompanion() {
        if (!uiState.value.canAddCompanion) return
        updateState { copy(persons = persons + DraftPerson(), currentPerson = persons.size, availability = null, selectedDate = null) }
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
        if (step == BookingStep.SLOT) prepareCalendar()
    }

    /** Step 2 (PRD S16): today → +90 days, weekly days off and closures disabled; the picked day's slots are restored. */
    private fun prepareCalendar() {
        val salon = uiState.value.salon ?: return
        val days = calendarDaysOf(deps.today(), BookingFlowDefaults.MAX_DAYS_AHEAD, salon.weeklySchedule, salon.upcomingClosures)
        val selected = uiState.value.person.date?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
        updateState { copy(calendar = days, visibleMonth = 0, selectedDate = selected) }
        if (selected != null && uiState.value.availability?.date != selected.toString()) loadSlots(selected)
    }

    private fun changeMonth(delta: Int) {
        val months = uiState.value.calendar.map { it.date.year to it.date.monthNumber }.distinct()
        updateState { copy(visibleMonth = (visibleMonth + delta).coerceIn(0, (months.size - 1).coerceAtLeast(0))) }
    }

    private fun selectDate(date: LocalDate) {
        if (uiState.value.calendar.none { it.date == date && it.enabled }) return
        updateState { copy(selectedDate = date, availability = null) }
        updatePerson { copy(date = date.toString(), start = null, staff = null) }
        loadSlots(date)
    }

    private fun loadSlots(date: LocalDate) {
        scope.launch {
            updateState { copy(slotsLoading = true, slotsError = null) }
            val state = uiState.value
            val others = state.persons.filterIndexed { index, _ -> index != state.currentPerson }
            when (val result = deps.loadAvailability(salonId, date.toString(), state.person, others)) {
                is AppResult.Success -> updateState { copy(slotsLoading = false, availability = result.data) }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    updateState { copy(slotsLoading = false, slotsError = message) }
                }
                AppResult.Loading -> Unit
            }
        }
    }

    /** A "Full" slot cannot be picked; picking resets the staff choice (eligibility depends on the slot). */
    private fun selectSlot(start: String) {
        val slot = uiState.value.availability?.slots?.firstOrNull { it.start == start && it.available } ?: return
        updatePerson { copy(start = slot.start, staff = null) }
    }

    private fun track(action: String, vararg params: Pair<String, String>) {
        deps.analytics.trackAction(AnalyticsAction(action, analyticsParams { params.forEach { (k, v) -> text(k, v) } }))
    }
}

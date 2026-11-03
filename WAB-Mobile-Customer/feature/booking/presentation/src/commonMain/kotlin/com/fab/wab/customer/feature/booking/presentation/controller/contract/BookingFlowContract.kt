package com.fab.wab.customer.feature.booking.presentation.controller.contract

import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.salon.BranchRules
import com.fab.wab.customer.core.domain.salon.BusinessRules
import com.fab.wab.customer.core.domain.salon.SalonBranch
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.core.domain.salon.SalonService
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.feature.booking.domain.model.BookingDraft
import com.fab.wab.customer.feature.booking.domain.model.BookingFlowDefaults
import com.fab.wab.customer.feature.booking.domain.model.CalendarDay
import com.fab.wab.customer.feature.booking.domain.model.DayAvailability
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.model.SelectionTotals
import com.fab.wab.customer.feature.booking.domain.model.selectionTotalsOf
import com.fab.wab.customer.feature.booking.domain.model.servicesOfferedTo
import kotlinx.datetime.LocalDate

/** PRD S16 steps + the branch step (BUSINESS_DOMAIN §5.18, only for several bookable branches); verification is a separate screen. */
enum class BookingStep { BRANCH, PERSON, SERVICES, SLOT, STAFF, COMPANIONS, SUMMARY }

/** Route arguments of S16: the salon and the branch chosen on salon details or carried by a deep link. */
data class BookingFlowArgs(val salonId: String, val branchId: String? = null)

sealed interface BookingFlowContract {

    data class UiState(
        val loading: Boolean = true,
        val offline: Boolean = false,
        val error: String? = null,
        /** The salon at the chosen branch: services, staff, hours and closures of that branch only. */
        val salon: SalonDetails? = null,
        /** The salon as loaded, with every bookable branch. */
        val fullSalon: SalonDetails? = null,
        val branchId: String? = null,
        val step: BookingStep = BookingStep.PERSON,
        val persons: List<DraftPerson> = listOf(DraftPerson()),
        val currentPerson: Int = 0,
        val nameError: Boolean = false,
        val genderError: Boolean = false,
        val calendar: List<CalendarDay> = emptyList(),
        val visibleMonth: Int = 0,
        val selectedDate: LocalDate? = null,
        val slotsLoading: Boolean = false,
        val slotsError: String? = null,
        val availability: DayAvailability? = null,
        val staffOverlapError: Boolean = false,
        val draft: BookingDraft? = null,
        val draftLoading: Boolean = false,
        val draftError: String? = null,
        /** The current person's design image is being uploaded (§5.23). */
        val referenceUploading: Boolean = false,
    ) {
        /** Tattoo studios only (§5.23): each person may attach one optional design image. */
        val allowsReference: Boolean get() = salon?.let { BusinessRules.allowsReferenceImage(it.businessType) } == true
        val canConfirm: Boolean get() = draft != null && !draftLoading
        val hasBranchStep: Boolean get() = fullSalon?.branches.orEmpty().size > BranchRules.SINGLE_BRANCH
        /** Steps of this salon: the branch step only when there is a branch to choose. */
        val steps: List<BookingStep> get() = if (hasBranchStep) BookingStep.entries else BookingStep.entries - BookingStep.BRANCH
        val stepIndex: Int get() = steps.indexOf(step).coerceAtLeast(0)
        val selectedBranch: SalonBranch? get() = fullSalon?.branches?.firstOrNull { it.id == branchId }
        val canContinueBranch: Boolean get() = selectedBranch != null
        val canContinueSlot: Boolean get() = person.start != null
        val canContinueStaff: Boolean get() = person.staff != null
        /** Staff eligible for the chosen slot (server-computed per person, bride rules included). */
        val eligibleStaffIds: Set<String>
            get() = availability?.slots?.firstOrNull { it.start == person.start }?.eligibleStaffIds?.toSet().orEmpty()
        val companionsCount: Int get() = persons.size - 1
        val canAddCompanion: Boolean get() = companionsCount < BookingFlowDefaults.MAX_COMPANIONS
        val isCompanionFlow: Boolean get() = currentPerson > 0
        val person: DraftPerson get() = persons[currentPerson]
        /** §5.19: a men's or women's salon fixes every person's gender; a BOTH salon or a clinic asks it per person. */
        val lockedGender: Gender? get() = salon?.lockedGender
        val asksGender: Boolean get() = salon != null && lockedGender == null
        val personGender: Gender? get() = lockedGender ?: person.gender
        /** Bride only at a women's or BOTH salon (never a clinic) and only for a woman (§5.19). */
        val showsBride: Boolean get() = salon?.allowsBride == true && personGender == Gender.FEMALE
        val canContinuePerson: Boolean get() = person.name.isNotBlank() && personGender != null
        val canContinueServices: Boolean get() = person.serviceIds.isNotEmpty()
        val totals: SelectionTotals get() = selectionTotalsOf(salon?.services.orEmpty(), person.serviceIds)
        /** Step 1 list of the current person: bride-only services only for a bride (PRD S16, SRV-170). */
        val offeredServices: List<SalonService> get() = servicesOfferedTo(salon?.services.orEmpty(), person.isBride)
    }

    sealed interface UiAction {
        data object OnRetry : UiAction
        data class OnBranchSelect(val branchId: String) : UiAction
        data class OnNameChange(val value: String) : UiAction
        data class OnBrideChange(val isBride: Boolean) : UiAction
        data class OnGenderChange(val gender: Gender) : UiAction
        data class OnServiceToggle(val serviceId: String) : UiAction
        /** Pick the current person's design image from the gallery (compressed on the device, then uploaded). */
        data object OnReferencePick : UiAction
        data object OnReferenceRemove : UiAction
        data class OnMonthChange(val delta: Int) : UiAction
        data class OnDateSelect(val date: LocalDate) : UiAction
        data class OnSlotSelect(val start: String) : UiAction
        data object OnAnyStaffSelect : UiAction
        data class OnStaffSelect(val staffId: String) : UiAction
        data object OnJustMe : UiAction
        data object OnAddCompanion : UiAction
        data class OnRemovePerson(val index: Int) : UiAction
        data class OnPaymentMethodSelect(val method: PaymentMethod) : UiAction
        data object OnConfirm : UiAction
        data object OnContinue : UiAction
        data object OnBack : UiAction
    }

    sealed interface SideEffect {
        data object Exit : SideEffect
        data class OpenVerification(val draftId: String) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}

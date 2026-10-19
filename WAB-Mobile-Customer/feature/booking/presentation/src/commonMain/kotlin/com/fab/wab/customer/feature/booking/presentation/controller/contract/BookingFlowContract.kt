package com.fab.wab.customer.feature.booking.presentation.controller.contract

import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.model.SelectionTotals
import com.fab.wab.customer.feature.booking.domain.model.selectionTotalsOf

/** PRD S16 steps; the indicator shows 0–5 (verification is a separate screen). */
enum class BookingStep { PERSON, SERVICES, SLOT, STAFF, COMPANIONS, SUMMARY }

sealed interface BookingFlowContract {

    data class UiState(
        val loading: Boolean = true,
        val offline: Boolean = false,
        val error: String? = null,
        val salon: SalonDetails? = null,
        val step: BookingStep = BookingStep.PERSON,
        val persons: List<DraftPerson> = listOf(DraftPerson()),
        val currentPerson: Int = 0,
        val nameError: Boolean = false,
    ) {
        val person: DraftPerson get() = persons[currentPerson]
        val isWomenSalon: Boolean get() = salon?.gender == Gender.FEMALE
        val canContinuePerson: Boolean get() = person.name.isNotBlank()
        val canContinueServices: Boolean get() = person.serviceIds.isNotEmpty()
        val totals: SelectionTotals get() = selectionTotalsOf(salon?.services.orEmpty(), person.serviceIds)
    }

    sealed interface UiAction {
        data object OnRetry : UiAction
        data class OnNameChange(val value: String) : UiAction
        data class OnBrideChange(val isBride: Boolean) : UiAction
        data class OnServiceToggle(val serviceId: String) : UiAction
        data object OnContinue : UiAction
        data object OnBack : UiAction
    }

    sealed interface SideEffect {
        data object Exit : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}

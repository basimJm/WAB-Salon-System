package com.fab.wab.customer.feature.booking.presentation.controller.vm

import com.fab.wab.customer.core.domain.salon.BranchRules
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.core.domain.salon.forBranch
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingStep

/**
 * After the salon loads (BUSINESS_DOMAIN §5.18): the branch is used without asking when it is the only bookable one or
 * the requested one (salon details / deep link); otherwise the flow starts at the branch step. A reload keeps the
 * customer's choice. Without branches (older data) the salon is used as it is.
 */
internal fun UiState.withLoadedSalon(full: SalonDetails, requestedBranchId: String?): UiState {
    val branch = BranchRules.preselectedForBooking(full.branches, branchId ?: requestedBranchId)
    val mustChoose = branch == null && full.branches.size > BranchRules.SINGLE_BRANCH
    return copy(
        fullSalon = full,
        branchId = branch?.id,
        salon = full.forBranch(branch),
        step = if (mustChoose && step == BookingStep.PERSON && !isCompanionFlow) BookingStep.BRANCH else step,
    )
}

/**
 * Step 0: services, staff and slots belong to the branch, so picking another branch clears them for every person
 * (names and the bride flag stay). Unknown ids and the current branch change nothing.
 */
internal fun UiState.withBranch(branchId: String): UiState {
    val full = fullSalon ?: return this
    val branch = full.branches.firstOrNull { it.id == branchId } ?: return this
    if (branchId == this.branchId) return this
    return copy(
        branchId = branch.id,
        salon = full.forBranch(branch),
        persons = persons.map { it.copy(serviceIds = emptyList(), date = null, start = null, staff = null) },
        calendar = emptyList(),
        selectedDate = null,
        availability = null,
        staffOverlapError = false,
    )
}

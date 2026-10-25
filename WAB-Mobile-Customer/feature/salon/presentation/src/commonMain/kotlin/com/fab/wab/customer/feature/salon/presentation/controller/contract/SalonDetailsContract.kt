package com.fab.wab.customer.feature.salon.presentation.controller.contract

import com.fab.wab.customer.core.domain.salon.SalonBranch
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.core.domain.salon.forBranch

/** Route arguments of S07: the salon and the branch to preselect (Home nearest entry, deep link). */
data class SalonDetailsArgs(val salonId: String, val branchId: String? = null)

sealed interface SalonDetailsContract {

    enum class SalonDialog { AuthRequired }

    data class UiState(
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val offline: Boolean = false,
        val error: String? = null,
        val salon: SalonDetails? = null,
        val signedIn: Boolean = false,
        val hoursExpanded: Boolean = false,
        val dialog: SalonDialog? = null,
        val selectedBranchId: String? = null,
    ) {
        /** Bookable branches, main first (§5.17). */
        val branches: List<SalonBranch> get() = salon?.branches.orEmpty()

        val selectedBranch: SalonBranch? get() = branches.firstOrNull { it.id == selectedBranchId }

        /** The always-visible branch selector appears when the salon has more than one bookable branch. */
        val showBranchSelector: Boolean get() = branches.size > 1

        /** What the screen renders: the salon at the selected branch (place, contacts, hours, staff, services). */
        val view: SalonDetails? get() = salon?.forBranch(selectedBranch)
    }

    sealed interface UiAction {
        data object OnRetry : UiAction
        data object OnRefresh : UiAction
        data object OnShareClick : UiAction
        data object OnFavoriteClick : UiAction
        data object OnLocationClick : UiAction
        data object OnCallClick : UiAction
        data object OnWhatsAppClick : UiAction
        data object OnHoursToggle : UiAction
        data class OnBranchSelect(val branchId: String) : UiAction
        data class OnStaffClick(val memberId: String) : UiAction
        data object OnAllReviewsClick : UiAction
        data object OnAddReviewClick : UiAction
        data class OnServiceClick(val serviceId: String) : UiAction
        data class OnGalleryClick(val index: Int) : UiAction
        data object OnBookClick : UiAction
        data object OnDialogConfirm : UiAction
        data object OnDialogDismiss : UiAction
    }

    sealed interface SideEffect {
        data class OpenStaff(val salonId: String, val memberId: String) : SideEffect
        data class OpenService(val salonId: String, val serviceId: String) : SideEffect
        data class OpenGallery(val salonId: String, val index: Int) : SideEffect
        data class OpenReviews(val salonId: String) : SideEffect
        data class OpenAddReview(val salonId: String) : SideEffect
        data class OpenBooking(val salonId: String, val branchId: String? = null) : SideEffect
        data object OpenLogin : SideEffect
        data class ShowError(val message: String) : SideEffect
        /** PRD §4.4: the salon does not exist or is not visible → back to Home with "Salon not available". */
        data object NotAvailable : SideEffect
    }
}

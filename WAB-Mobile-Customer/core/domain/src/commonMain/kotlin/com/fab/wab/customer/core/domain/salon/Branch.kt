package com.fab.wab.customer.core.domain.salon

import com.fab.wab.customer.core.domain.model.LocationData

/**
 * A branch as cards, booking rows and review labels carry it (BUSINESS_DOMAIN §3.3a); the name is already in the
 * request language. [locationText] is only sent on bookings.
 */
data class BranchRef(val id: String, val name: String, val locationText: String? = null)

/**
 * A bookable branch on the salon details (BUSINESS_DOMAIN §5.17): its own place, contacts, hours and closures.
 * The server lists only bookable branches, main first.
 */
data class SalonBranch(
    val id: String,
    val name: String,
    val isMain: Boolean,
    val locationText: String?,
    val location: LocationData?,
    val phone: String?,
    val whatsapp: String?,
    val isOpenNow: Boolean,
    val todayHours: OpeningHours?,
    val closedReason: String?,
    val weeklySchedule: List<DaySchedule>,
    val upcomingClosures: List<Closure>,
)

/** Branch rules of the customer app (BUSINESS_DOMAIN §5.17, §5.18), pure so every screen applies them the same way. */
object BranchRules {

    /** A salon with more than this many bookable branches shows a branch count and a branch selector. */
    const val SINGLE_BRANCH = 1

    fun hasSeveralBranches(branchCount: Int): Boolean = branchCount > SINGLE_BRANCH

    /** The branch to show first: the requested one (deep link, last choice) when listed, else the main one, else the first. */
    fun initialBranch(branches: List<SalonBranch>, requestedId: String?): SalonBranch? =
        branches.firstOrNull { it.id == requestedId } ?: branches.firstOrNull { it.isMain } ?: branches.firstOrNull()

    /**
     * The branch a booking can start with without asking (§5.18 step 1 skipped): the only bookable branch, or the
     * requested one when listed. Null means the customer must choose.
     */
    fun preselectedForBooking(branches: List<SalonBranch>, requestedId: String?): SalonBranch? =
        branches.singleOrNull() ?: branches.firstOrNull { it.id == requestedId }

    /** Items of the selected branch; items without a branch (older server data) belong to every branch. */
    fun <T> ofBranch(items: List<T>, branchId: String?, branchOf: (T) -> String?): List<T> =
        if (branchId == null) items else items.filter { branchOf(it).let { id -> id == null || id == branchId } }
}

/** Services offered by [branchId] (§5.17: services and prices are per branch). */
fun SalonDetails.servicesOf(branchId: String?): List<SalonService> = BranchRules.ofBranch(services, branchId) { it.branchId }

/** Staff working at [branchId] (§5.17: staff are per branch). */
fun SalonDetails.staffOf(branchId: String?): List<StaffPreview> = BranchRules.ofBranch(staff, branchId) { it.branchId }

package com.fab.wab.customer.core.domain.salon

/** Today's opening window as the server sends it: "HH:mm" in Asia/Amman (BUSINESS_DOMAIN schedules). */
data class OpeningHours(val open: String, val close: String)

/**
 * Salon card facts shared by Home, lists, search and favorites (PRD 8.0 shared card). Place, hours and distance are
 * those of [branch] (the nearest bookable one, else the main one); [branchCount] counts bookable branches (§5.17);
 * [title] is the Home nearest entry title ("Salon - Branch"), null elsewhere.
 */
data class SalonSummary(
    val id: String,
    val name: String,
    val imageUrl: String?,
    val rating: Float,
    val reviewsCount: Int,
    val locationText: String?,
    val shortDescription: String?,
    val isOpenNow: Boolean,
    val todayHours: OpeningHours?,
    val isFavorite: Boolean,
    val distanceKm: Double?,
    val branchCount: Int = BranchRules.SINGLE_BRANCH,
    val branch: BranchRef? = null,
    val title: String? = null,
) {
    /** A Home nearest entry is one branch ("Salon - Branch"); every other card is the whole salon. */
    val isBranchEntry: Boolean get() = !title.isNullOrBlank()

    /** Card title: the nearest entry's "Salon - Branch" (salon name for single-branch salons), else the salon name. */
    val displayName: String get() = title?.takeIf { it.isNotBlank() } ?: name

    /** Branch count shown on the card: a branch entry never shows one. */
    val shownBranchCount: Int get() = if (isBranchEntry) BranchRules.SINGLE_BRANCH else branchCount

    /** Unique list key: nearest lists hold one entry per branch, so the same salon can appear more than once. */
    val entryKey: String get() = preselectedBranchId?.let { id + ENTRY_KEY_SEPARATOR + it } ?: id

    /** The branch to preselect when the card opens the salon: only a branch entry names one. */
    val preselectedBranchId: String? get() = branch?.id?.takeIf { isBranchEntry }

    private companion object {
        const val ENTRY_KEY_SEPARATOR = "/"
    }
}

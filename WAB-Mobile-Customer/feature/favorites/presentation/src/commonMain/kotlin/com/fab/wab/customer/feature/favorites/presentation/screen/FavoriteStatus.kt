package com.fab.wab.customer.feature.favorites.presentation.screen

/** Status line of a favorite card (PRD S20 = the S03 card status). */
internal sealed interface FavoriteStatus {
    data class Open(val hours: String) : FavoriteStatus
    /** Outside today's hours (before opening or after closing): not "closed today" (E2E CUS-093). */
    data class ClosedNow(val hours: String) : FavoriteStatus
    data object ClosedToday : FavoriteStatus
}

internal fun favoriteStatusOf(isOpenNow: Boolean, todayHours: String?): FavoriteStatus {
    val hours = todayHours?.takeIf { it.isNotBlank() } ?: return FavoriteStatus.ClosedToday
    return if (isOpenNow) FavoriteStatus.Open(hours) else FavoriteStatus.ClosedNow(hours)
}

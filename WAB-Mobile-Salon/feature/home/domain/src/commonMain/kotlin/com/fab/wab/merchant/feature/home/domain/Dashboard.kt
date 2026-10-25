package com.fab.wab.merchant.feature.home.domain

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.session.SalonState

/** Header + status strip of Home (PRD M07): who the salon is and what is still missing to go live. */
data class DashboardSalon(
    val id: String,
    val name: String,
    val imageUrl: String?,
    val state: SalonState?,
    val missing: List<String>,
)

/** Trial / subscription ending within the server's warning window (PRD M07: ≤ 7 days). */
data class SubscriptionWarning(val endsAt: String, val daysRemaining: Int)

/** One booking row of the dashboard (pending preview, next booking, today's timeline). Times are ISO instants (UTC). */
data class DashboardBooking(
    val id: String,
    val reference: String,
    val status: BookingStatus?,
    val hasBride: Boolean,
    val start: String,
    val end: String,
    val respondBy: String,
    val requestedAt: String,
    val persons: Int,
    val customerName: String,
    val staffNames: List<String>,
    val branchName: String?,
)

/** `pending` block (BOOKINGS_RESPOND): [count] is the server total, [items] the newest few. */
data class PendingRequests(val count: Int, val items: List<DashboardBooking>)

/** Today at a glance + timeline (own bookings only for BOOKINGS_VIEW_OWN; the server scopes it). */
data class TodayOverview(
    val approved: Int,
    val completed: Int,
    val next: DashboardBooking?,
    val timeline: List<DashboardBooking>,
)

/** This week's quick stats (STATISTICS_VIEW); [revenue] is the contract's JOD decimal string. */
data class QuickStats(val bookings: Int, val revenue: String, val rating: Double)

/**
 * `GET /dashboard` (DASHBOARD_VIEW), one call for the whole screen; blocks the member may not see come back null.
 * Server-scoped to the member's branch.
 */
data class Dashboard(
    val salon: DashboardSalon,
    val subscriptionWarning: SubscriptionWarning?,
    val unreadNotifications: Int,
    val pending: PendingRequests?,
    val today: TodayOverview?,
    val quickStats: QuickStats?,
)

interface DashboardRepository {
    suspend fun dashboard(): AppResult<Dashboard>
}


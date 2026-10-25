package com.fab.wab.merchant.feature.home.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetDashboardData
import com.fab.wab.merchant.core.data.contract.generated.GetDashboardDataPendingItemsItem
import com.fab.wab.merchant.core.data.contract.generated.GetDashboardDataTodayNext
import com.fab.wab.merchant.core.data.contract.generated.GetDashboardDataTodayTimelineItem
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.home.domain.Dashboard
import com.fab.wab.merchant.feature.home.domain.DashboardBooking
import com.fab.wab.merchant.feature.home.domain.DashboardRepository
import com.fab.wab.merchant.feature.home.domain.DashboardSalon
import com.fab.wab.merchant.feature.home.domain.PendingRequests
import com.fab.wab.merchant.feature.home.domain.QuickStats
import com.fab.wab.merchant.feature.home.domain.SubscriptionWarning
import com.fab.wab.merchant.feature.home.domain.TodayOverview
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get

class DashboardApi(private val client: HttpClient) {
    suspend fun dashboard(): BaseResponse<GetDashboardData> = client.get(MerchantOperations.getDashboard.path).body()
}

/** The three booking row shapes of the contract carry the same fields; one raw row maps them all. */
private data class RawRow(
    val id: String,
    val reference: String,
    val status: String,
    val hasBride: Boolean,
    val start: String,
    val end: String,
    val respondBy: String,
    val requestedAt: String,
    val persons: Double,
    val customer: String?,
    val staff: List<String>,
    val branch: String?,
)

private fun RawRow.toDomain() = DashboardBooking(
    id = id,
    reference = reference,
    status = BookingStatus.fromCode(status),
    hasBride = hasBride,
    start = start,
    end = end,
    respondBy = respondBy,
    requestedAt = requestedAt,
    persons = persons.toInt(),
    customerName = customer.orEmpty(),
    staffNames = staff,
    branchName = branch,
)

fun GetDashboardDataPendingItemsItem.toDomain() = RawRow(
    id, referenceNumber, status, hasBride, appointmentStart, appointmentEnd, respondBy, requestedAt, personsCount,
    customer?.name, staff.map { it.name }, branch?.name,
).toDomain()

fun GetDashboardDataTodayNext.toDomain() = RawRow(
    id, referenceNumber, status, hasBride, appointmentStart, appointmentEnd, respondBy, requestedAt, personsCount,
    customer?.name, staff.map { it.name }, branch?.name,
).toDomain()

fun GetDashboardDataTodayTimelineItem.toDomain() = RawRow(
    id, referenceNumber, status, hasBride, appointmentStart, appointmentEnd, respondBy, requestedAt, personsCount,
    customer?.name, staff.map { it.name }, branch?.name,
).toDomain()

fun GetDashboardData.toDomain() = Dashboard(
    salon = DashboardSalon(
        id = salon.id,
        name = salon.name,
        imageUrl = salon.profileImageUrl?.takeIf { it.isNotBlank() },
        state = SalonState.fromCode(salon.state),
        missing = salon.missing,
    ),
    subscriptionWarning = subscriptionWarning?.let { SubscriptionWarning(it.endsAt, it.daysRemaining.toInt()) },
    unreadNotifications = unreadNotifications.toInt(),
    pending = pending?.let { block -> PendingRequests(block.count.toInt(), block.items.map { it.toDomain() }) },
    today = today?.let { block ->
        TodayOverview(
            approved = block.approved.toInt(),
            completed = block.completed.toInt(),
            next = block.next?.toDomain(),
            timeline = block.timeline.map { it.toDomain() },
        )
    },
    quickStats = quickStats?.let { QuickStats(it.bookings.toInt(), it.revenue, it.rating) },
)

class DashboardRepositoryImpl(private val api: DashboardApi) : DashboardRepository {
    override suspend fun dashboard(): AppResult<Dashboard> = safeApiCall { api.dashboard() }.mapSuccess { it.data.toDomain() }
}

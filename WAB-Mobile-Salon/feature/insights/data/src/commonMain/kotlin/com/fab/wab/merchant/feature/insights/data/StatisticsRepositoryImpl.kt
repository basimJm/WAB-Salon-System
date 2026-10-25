package com.fab.wab.merchant.feature.insights.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetStatisticsData
import com.fab.wab.merchant.core.data.contract.generated.GetStatisticsDataBookings
import com.fab.wab.merchant.core.data.contract.generated.GetStatisticsDataBookingsByStatus
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.insights.domain.BookingStats
import com.fab.wab.merchant.feature.insights.domain.DayStat
import com.fab.wab.merchant.feature.insights.domain.Revenue
import com.fab.wab.merchant.feature.insights.domain.Statistics
import com.fab.wab.merchant.feature.insights.domain.StatisticsRepository
import com.fab.wab.merchant.feature.insights.domain.TopService
import com.fab.wab.merchant.feature.insights.domain.TopStaff
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import kotlinx.datetime.LocalDate

/** Query names of `GET /statistics` (contract). */
internal object StatisticsParams {
    const val FROM = "from"
    const val TO = "to"
    const val BRANCH_ID = "branchId"
}

class StatisticsApi(private val client: HttpClient) {
    suspend fun statistics(from: LocalDate, to: LocalDate, branchId: String?): BaseResponse<GetStatisticsData> =
        client.get(MerchantOperations.getStatistics.path) {
            parameter(StatisticsParams.FROM, from.toString())
            parameter(StatisticsParams.TO, to.toString())
            branchId?.let { parameter(StatisticsParams.BRANCH_ID, it) }
        }.body()
}

fun GetStatisticsDataBookingsByStatus.toDomain(): Map<BookingStatus, Int> = mapOf(
    BookingStatus.PENDING to PENDING.toInt(),
    BookingStatus.APPROVED to APPROVED.toInt(),
    BookingStatus.REJECTED to REJECTED.toInt(),
    BookingStatus.CANCELLED_BY_CUSTOMER to CANCELLED_BY_CUSTOMER.toInt(),
    BookingStatus.CANCELLED_BY_SALON to CANCELLED_BY_SALON.toInt(),
    BookingStatus.AUTO_CANCELLED to AUTO_CANCELLED.toInt(),
    BookingStatus.COMPLETED to COMPLETED.toInt(),
    BookingStatus.NO_SHOW to NO_SHOW.toInt(),
)

fun GetStatisticsDataBookings.toDomain() = BookingStats(
    total = total.toInt(),
    byStatus = byStatus.toDomain(),
    approvalRate = approvalRate,
    cancellationRate = cancellationRate,
    noShowRate = noShowRate,
    averageResponseMinutes = averageResponseMinutes,
    brideBookings = brideBookings.toInt(),
    revenue = Revenue(revenue.online, revenue.atSalon, revenue.total),
)

fun GetStatisticsData.toDomain() = Statistics(
    bookings = bookings.toDomain(),
    profileViews = profileViews.toInt(),
    newReviews = reviews.new.toInt(),
    averageRating = reviews.averageRating,
    days = days.map { DayStat(it.date, it.bookings.toInt(), it.revenue) },
    topServices = topServices.map { TopService(it.id, it.name, it.bookings.toInt()) },
    topStaff = topStaff.map { TopStaff(it.id, it.firstName, it.bookings.toInt(), it.rating) },
)

class StatisticsRepositoryImpl(private val api: StatisticsApi) : StatisticsRepository {
    override suspend fun statistics(from: LocalDate, to: LocalDate, branchId: String?): AppResult<Statistics> =
        safeApiCall { api.statistics(from, to, branchId) }.mapSuccess { it.data.toDomain() }
}

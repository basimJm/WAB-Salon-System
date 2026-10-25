package com.fab.wab.merchant.feature.bookings.data.remote

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsCalendarDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetSalonHoursData
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import kotlinx.datetime.LocalDate

class CalendarApi(private val client: HttpClient) {
    suspend fun entries(from: LocalDate, to: LocalDate, staffIds: Set<String>): BaseResponse<List<GetBookingsCalendarDataItem>> =
        client.get(MerchantOperations.getBookingsCalendar.path) {
            parameter(BookingsParams.FROM, from.toString())
            parameter(BookingsParams.TO, to.toString())
            staffIds.forEach { parameter(BookingsParams.STAFF_ID, it) }
        }.body()

    suspend fun hours(): BaseResponse<GetSalonHoursData> = client.get(MerchantOperations.getSalonHours.path).body()
}

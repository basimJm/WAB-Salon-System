package com.fab.wab.customer.feature.bookings.data.repository

import com.fab.wab.customer.core.data.contract.generated.GetBookingsDataItem
import com.fab.wab.customer.core.data.contract.generated.PostBookingsByIdCancelBody
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.core.domain.booking.BookingSummary
import com.fab.wab.customer.core.domain.booking.BookingTab
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.core.domain.booking.PaymentStatus
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.network.safeApiCall
import com.fab.wab.customer.feature.bookings.data.remote.BookingsApi
import com.fab.wab.customer.feature.bookings.domain.repository.BookingsRepository

class BookingsRepositoryImpl(private val api: BookingsApi) : BookingsRepository {
    override suspend fun list(tab: BookingTab, query: String, page: Int, pageSize: Int): AppResult<List<BookingSummary>> =
        safeApiCall { api.list(tab.code, query, page, pageSize) }.mapSuccess { response -> response.data.map { it.toDomain() } }

    override suspend fun details(bookingId: String): AppResult<BookingDetails> =
        safeApiCall { api.details(bookingId) }.mapSuccess { it.data.toDomain() }

    override suspend fun cancel(bookingId: String, reasonText: String?): AppResult<String> =
        safeApiCall { api.cancel(bookingId, PostBookingsByIdCancelBody(reasonText)) }.mapSuccess { it.data.refundDue }
}

fun GetBookingsDataItem.toDomain(): BookingSummary = BookingSummary(
    id = id,
    referenceNumber = referenceNumber,
    status = BookingStatus.fromCode(status),
    paymentMethod = PaymentMethod.fromCode(paymentMethod),
    paymentStatus = PaymentStatus.fromCode(paymentStatus),
    hasBride = hasBride,
    appointmentStart = appointmentStart,
    appointmentEnd = appointmentEnd,
    personsCount = personsCount.toInt(),
    total = total,
    salonId = salon?.id,
    salonName = salon?.name,
    staffNames = staff.map { it.name },
)

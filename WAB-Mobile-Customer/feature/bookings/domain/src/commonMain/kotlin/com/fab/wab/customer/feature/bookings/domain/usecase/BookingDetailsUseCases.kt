package com.fab.wab.customer.feature.bookings.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.feature.bookings.domain.repository.BookingsRepository

class GetBookingDetailsUseCase(private val repository: BookingsRepository) {
    suspend operator fun invoke(bookingId: String): AppResult<BookingDetails> = repository.details(bookingId)
}

class CancelBookingUseCase(private val repository: BookingsRepository) {
    suspend operator fun invoke(bookingId: String): AppResult<String> = repository.cancel(bookingId, reasonText = null)
}

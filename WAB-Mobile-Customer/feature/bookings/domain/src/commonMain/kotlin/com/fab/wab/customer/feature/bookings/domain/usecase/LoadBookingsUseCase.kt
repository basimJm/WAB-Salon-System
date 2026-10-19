package com.fab.wab.customer.feature.bookings.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.booking.BookingSummary
import com.fab.wab.customer.core.domain.booking.BookingTab
import com.fab.wab.customer.feature.bookings.domain.repository.BookingsDefaults
import com.fab.wab.customer.feature.bookings.domain.repository.BookingsRepository

class LoadBookingsUseCase(private val repository: BookingsRepository) {
    suspend operator fun invoke(tab: BookingTab, query: String, page: Int): AppResult<List<BookingSummary>> =
        repository.list(tab, query.trim().take(BookingsDefaults.MAX_QUERY_LENGTH), page, BookingsDefaults.PAGE_SIZE)
}

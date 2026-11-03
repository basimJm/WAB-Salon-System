package com.fab.wab.merchant.feature.bookings.domain.repository

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.feature.bookings.domain.model.CreatedBooking
import com.fab.wab.merchant.feature.bookings.domain.model.CustomerLookup
import com.fab.wab.merchant.feature.bookings.domain.model.NewBookingRequest
import com.fab.wab.merchant.feature.bookings.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.bookings.domain.model.SalonServiceOption

/** A booking created by a member for a customer (BUSINESS_DOMAIN §5.20, `BOOKINGS_CREATE`). */
interface NewBookingRepository {
    /** `GET /customers/lookup?countryCode=&number=`. */
    suspend fun lookup(phone: PhoneNumber): AppResult<CustomerLookup>

    /** Active services of the salon (`GET /salon/services`, every page). */
    suspend fun services(): AppResult<List<SalonServiceOption>>

    /** `POST /bookings`: APPROVED, pay at the business. */
    suspend fun create(request: NewBookingRequest): AppResult<CreatedBooking>
}

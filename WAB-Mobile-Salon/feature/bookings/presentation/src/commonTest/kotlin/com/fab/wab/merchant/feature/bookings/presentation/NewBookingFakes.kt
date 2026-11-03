package com.fab.wab.merchant.feature.bookings.presentation

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.locations.Area
import com.fab.wab.merchant.core.domain.locations.City
import com.fab.wab.merchant.core.domain.locations.Country
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.feature.bookings.domain.model.CreatedBooking
import com.fab.wab.merchant.feature.bookings.domain.model.CustomerGender
import com.fab.wab.merchant.feature.bookings.domain.model.CustomerLookup
import com.fab.wab.merchant.feature.bookings.domain.model.NewBookingRequest
import com.fab.wab.merchant.feature.bookings.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.bookings.domain.model.SalonServiceOption
import com.fab.wab.merchant.feature.bookings.domain.repository.NewBookingRepository

internal val JORDAN = Country("JO", "Jordan", "+962", null, "^7[789]\\d{7}$")
internal val CUT = SalonServiceOption("sv1", "Cut", "18.000", 45, false)
internal val COLOR = SalonServiceOption("sv2", "Color", "32.500", 90, false)
internal const val REGISTERED_NUMBER = "791234567"

internal class FakeNewBookingRepository : NewBookingRepository {
    val lookups = mutableListOf<PhoneNumber>()
    val created = mutableListOf<NewBookingRequest>()
    var servicesResult: AppResult<List<SalonServiceOption>> = AppResult.Success(listOf(CUT, COLOR))
    var createResult: AppResult<CreatedBooking> = AppResult.Success(CreatedBooking("new-1", "WAB-NEW", false))
    var lookupError: AppResult.Error? = null

    override suspend fun lookup(phone: PhoneNumber): AppResult<CustomerLookup> {
        lookups += phone
        lookupError?.let { return it }
        return AppResult.Success(
            if (phone.number == REGISTERED_NUMBER) CustomerLookup(true, "Rana", CustomerGender.FEMALE) else CustomerLookup(false, null, null),
        )
    }

    override suspend fun services(): AppResult<List<SalonServiceOption>> = servicesResult

    override suspend fun create(request: NewBookingRequest): AppResult<CreatedBooking> {
        created += request
        return createResult
    }
}

internal class FakeLocations(private val countries: List<Country> = listOf(JORDAN)) : LocationsRepository {
    override suspend fun countries(refresh: Boolean): AppResult<List<Country>> = AppResult.Success(countries)
    override suspend fun cities(countryCode: String, refresh: Boolean): AppResult<List<City>> = AppResult.Success(emptyList())
    override suspend fun areas(cityId: String, refresh: Boolean): AppResult<List<Area>> = AppResult.Success(emptyList())
}

package com.fab.wab.merchant.feature.bookings.data.repository

import com.fab.wab.merchant.core.data.contract.generated.GetCustomersLookupData
import com.fab.wab.merchant.core.data.contract.generated.GetSalonServicesDataItem
import com.fab.wab.merchant.core.data.contract.generated.PostBookingsBody
import com.fab.wab.merchant.core.data.contract.generated.PostBookingsBodyCustomer
import com.fab.wab.merchant.core.data.contract.generated.PostBookingsBodyCustomerPhone
import com.fab.wab.merchant.core.data.contract.generated.PostBookingsBodyPersonsItem
import com.fab.wab.merchant.core.data.contract.generated.PostBookingsData
import com.fab.wab.merchant.feature.bookings.domain.model.CreatedBooking
import com.fab.wab.merchant.feature.bookings.domain.model.CustomerGender
import com.fab.wab.merchant.feature.bookings.domain.model.CustomerLookup
import com.fab.wab.merchant.feature.bookings.domain.model.NewBookingRequest
import com.fab.wab.merchant.feature.bookings.domain.model.SalonServiceOption

fun GetCustomersLookupData.toDomain(): CustomerLookup =
    CustomerLookup(registered, firstName?.takeIf(String::isNotBlank), CustomerGender.fromCode(gender))

fun GetSalonServicesDataItem.toOption(): SalonServiceOption = SalonServiceOption(id, name, price, durationMinutes.toInt(), brideOnly)

fun PostBookingsData.toDomain(): CreatedBooking = CreatedBooking(id, referenceNumber, customerRegistered)

/**
 * `POST /bookings` body (§5.20): the name and gender of the customer only for a number without an account (trimmed,
 * blank = not sent), each person's start as an ISO instant in UTC, no staff id for "any available".
 */
fun NewBookingRequest.toBody(): PostBookingsBody = PostBookingsBody(
    branchId = branchId,
    customer = PostBookingsBodyCustomer(
        phone = PostBookingsBodyCustomerPhone(customer.phone.countryCode, customer.phone.number),
        name = customer.name?.trim()?.takeIf(String::isNotEmpty),
        gender = customer.gender?.name,
    ),
    persons = persons.map { person ->
        PostBookingsBodyPersonsItem(
            name = person.name.trim(),
            gender = person.gender?.name,
            serviceIds = person.serviceIds,
            staffId = person.staffId,
            start = person.start.toString(),
            referenceImageKey = person.referenceImageKey,
        )
    },
)

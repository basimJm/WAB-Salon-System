package com.fab.wab.merchant.feature.bookings.domain.model

import kotlinx.datetime.LocalDate
import kotlinx.datetime.LocalDateTime
import kotlinx.datetime.LocalTime
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toInstant
import kotlin.time.Instant

/** Gender of a customer without the app (BUSINESS_DOMAIN §5.20 `customerContact.gender`). */
enum class CustomerGender {
    MALE,
    FEMALE,
    ;

    companion object {
        fun fromCode(code: String?): CustomerGender? = entries.firstOrNull { it.name == code }
    }
}

/** A mobile number: ISO country ([countryCode], "JO") and the national [number] (digits). */
data class PhoneNumber(val countryCode: String, val number: String)

/** `GET /customers/lookup`: a registered customer answers the first name and gender only. */
data class CustomerLookup(val registered: Boolean, val firstName: String?, val gender: CustomerGender?)

/** A bookable service of the salon (`GET /salon/services`); [price] is the contract's JOD decimal text. */
data class SalonServiceOption(
    val id: String,
    val name: String,
    val price: String,
    val durationMinutes: Int,
    val brideOnly: Boolean,
)

/** The customer of a booking a member creates: [name] and [gender] only for a number without an account. */
data class NewBookingCustomer(val phone: PhoneNumber, val name: String?, val gender: CustomerGender?)

/** One person of the booking; [staffId] null = any eligible staff, [start] the slot start (UTC on the wire). */
data class NewBookingPerson(
    val name: String,
    val gender: CustomerGender?,
    val serviceIds: List<String>,
    val staffId: String?,
    val start: Instant,
    val referenceImageKey: String? = null,
)

/** `POST /bookings` (§5.20): [branchId] only for the owner (a branch member books their own branch). */
data class NewBookingRequest(val branchId: String?, val customer: NewBookingCustomer, val persons: List<NewBookingPerson>)

/** The created booking (APPROVED, pay at the business). */
data class CreatedBooking(val id: String, val reference: String, val customerRegistered: Boolean)

/** Limits of the new booking form (BUSINESS_DOMAIN §5.4 slots, §5.20). */
object NewBookingRules {
    /** Slots every 15 minutes (§5.4). */
    const val SLOT_STEP_MINUTES = 15

    /** Bookable up to 90 days ahead (§5.4). */
    const val MAX_DAYS_AHEAD = 90

    /** `customer.name` / `persons[].name` length (contract). */
    const val NAME_MAX = 50

    const val MINUTES_PER_DAY = 1_440
    private const val MINUTES_PER_HOUR = 60
    private const val FILS_PER_JOD = 1_000L
    private const val FILS_DIGITS = 3
    private const val DECIMAL_POINT = '.'
    private const val PAD = '0'
    private const val TIME_SEPARATOR = ":"
    private const val TIME_DIGITS = 2
    private const val DECIMAL_PARTS = 2

    /** The start instant of [minuteOfDay] on [date] in the business [zone] (stored and sent in UTC). */
    fun slotStart(date: LocalDate, minuteOfDay: Int, zone: TimeZone): Instant =
        LocalDateTime(date, LocalTime(minuteOfDay / MINUTES_PER_HOUR, minuteOfDay % MINUTES_PER_HOUR)).toInstant(zone)

    /** Slot minutes of a day; for today only those after [nowMinute] (a past start is refused by the server). */
    fun slotMinutes(nowMinute: Int?): List<Int> =
        (0 until MINUTES_PER_DAY step SLOT_STEP_MINUTES).filter { nowMinute == null || it > nowMinute }

    /** Sum of the selected services' durations (§5.4: duration = sum of services). */
    fun totalMinutes(services: List<SalonServiceOption>): Int = services.sumOf { it.durationMinutes }

    /** Sum of the prices in integer fils; a malformed price counts as 0. */
    fun totalFils(services: List<SalonServiceOption>): Long = services.sumOf { filsOf(it.price) ?: 0L }

    /** "18.5" / "18.500" → 18500 fils; null when not a JOD decimal text. */
    fun filsOf(price: String): Long? {
        val parts = price.trim().split(DECIMAL_POINT)
        val whole = parts.getOrNull(0)?.toLongOrNull() ?: return null
        val fraction = parts.getOrNull(1).orEmpty()
        if (parts.size > DECIMAL_PARTS || fraction.length > FILS_DIGITS || fraction.any { !it.isDigit() }) return null
        return whole * FILS_PER_JOD + fraction.padEnd(FILS_DIGITS, PAD).toLong()
    }

    /** "HH:mm" of a minute of the day (the 12-hour text is made by the screen). */
    fun hhmm(minuteOfDay: Int): String =
        (minuteOfDay / MINUTES_PER_HOUR).toString().padStart(TIME_DIGITS, PAD) + TIME_SEPARATOR +
            (minuteOfDay % MINUTES_PER_HOUR).toString().padStart(TIME_DIGITS, PAD)
}

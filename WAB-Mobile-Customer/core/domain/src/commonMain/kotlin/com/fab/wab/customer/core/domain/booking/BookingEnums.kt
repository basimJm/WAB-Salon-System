package com.fab.wab.customer.core.domain.booking

/** BUSINESS_DOMAIN `BookingStatus`. */
enum class BookingStatus(val code: String) {
    PENDING("PENDING"),
    APPROVED("APPROVED"),
    REJECTED("REJECTED"),
    CANCELLED_BY_CUSTOMER("CANCELLED_BY_CUSTOMER"),
    CANCELLED_BY_SALON("CANCELLED_BY_SALON"),
    AUTO_CANCELLED("AUTO_CANCELLED"),
    COMPLETED("COMPLETED"),
    NO_SHOW("NO_SHOW"),
    UNKNOWN(""),
    ;

    companion object {
        fun fromCode(code: String?): BookingStatus = entries.firstOrNull { it != UNKNOWN && it.code.equals(code?.trim(), true) } ?: UNKNOWN
    }
}

/** BUSINESS_DOMAIN `PaymentStatus`. */
enum class PaymentStatus(val code: String) {
    PAY_ON_ARRIVAL("PAY_ON_ARRIVAL"),
    DEPOSIT_PAID("DEPOSIT_PAID"),
    FULLY_PAID("FULLY_PAID"),
    PAID("PAID"),
    UNKNOWN(""),
    ;

    companion object {
        fun fromCode(code: String?): PaymentStatus = entries.firstOrNull { it != UNKNOWN && it.code.equals(code?.trim(), true) } ?: UNKNOWN
    }
}

/** BUSINESS_DOMAIN `PaymentOption`. */
enum class PaymentMethod(val code: String) {
    PAY_ON_ARRIVAL("PAY_ON_ARRIVAL"),
    DEPOSIT("DEPOSIT"),
    FULL_ONLINE("FULL_ONLINE"),
    UNKNOWN(""),
    ;

    companion object {
        fun fromCode(code: String?): PaymentMethod = entries.firstOrNull { it != UNKNOWN && it.code.equals(code?.trim(), true) } ?: UNKNOWN
    }
}

/** S14 tabs (`GET /bookings?tab=`). */
enum class BookingTab(val code: String) { UPCOMING("UPCOMING"), PAST("PAST") }

/** Who created the booking (BUSINESS_DOMAIN §5.20): the customer in the app or the business for the customer. */
enum class BookingSource(val code: String) {
    CUSTOMER_APP("CUSTOMER_APP"),
    MERCHANT("MERCHANT"),
    ;

    companion object {
        /** Unknown or missing codes read as an app booking (every booking before §5.20). */
        fun fromCode(code: String?): BookingSource = entries.firstOrNull { it.code.equals(code?.trim(), true) } ?: CUSTOMER_APP
    }
}

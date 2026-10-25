package com.fab.wab.merchant.core.domain.booking

/** Booking lifecycle of BUSINESS_DOMAIN §2 (`BookingStatus`). */
enum class BookingStatus {
    PENDING,
    APPROVED,
    REJECTED,
    CANCELLED_BY_CUSTOMER,
    CANCELLED_BY_SALON,
    AUTO_CANCELLED,
    COMPLETED,
    NO_SHOW,
    ;

    companion object {
        fun fromCode(code: String?): BookingStatus? = entries.firstOrNull { it.name == code?.trim()?.uppercase() }
    }
}

/** Payment state of a booking (BUSINESS_DOMAIN §2 `PaymentStatus`). */
enum class PaymentStatus {
    PAY_ON_ARRIVAL,
    DEPOSIT_PAID,
    FULLY_PAID,
    PAID,
    ;

    companion object {
        fun fromCode(code: String?): PaymentStatus? = entries.firstOrNull { it.name == code?.trim()?.uppercase() }
    }
}

/** Refund state of a booking (BUSINESS_DOMAIN §2 `RefundStatus`); [NONE] when nothing is refunded. */
enum class RefundStatus {
    NONE,
    REFUND_PENDING,
    REFUNDED,
    REFUND_FAILED,
    ;

    companion object {
        fun fromCode(code: String?): RefundStatus = entries.firstOrNull { it.name == code?.trim()?.uppercase() } ?: NONE
    }
}

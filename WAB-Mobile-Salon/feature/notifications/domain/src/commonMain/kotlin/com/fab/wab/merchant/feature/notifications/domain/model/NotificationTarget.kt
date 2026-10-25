package com.fab.wab.merchant.feature.notifications.domain.model

/** Where a merchant notification leads (PRD M24 tap routing). */
sealed interface NotificationTarget {
    data class Booking(val bookingId: String) : NotificationTarget
    data object Application : NotificationTarget
    data object CatalogRequests : NotificationTarget
    data object Finance : NotificationTarget
    data object Subscription : NotificationTarget
}

/** Event prefixes of the server notifications (`booking.*`, `application.*`, …). */
private object EventPrefix {
    const val APPLICATION = "application."
    const val CATALOG = "catalog_request."
    const val PAYOUT = "payout."
    const val REFUND = "refund."
    const val SUBSCRIPTION = "subscription."
}

/**
 * Booking → M09 (any event carrying a booking id), application → M05, catalog request → M16 requests,
 * payout / refund → M22, subscription → M23. Reviews (M20) wait for SRV-131, so they open nothing yet.
 */
fun Notification.target(): NotificationTarget? {
    bookingId?.takeIf { it.isNotBlank() }?.let { return NotificationTarget.Booking(it) }
    return when {
        event.startsWith(EventPrefix.APPLICATION) -> NotificationTarget.Application
        event.startsWith(EventPrefix.CATALOG) -> NotificationTarget.CatalogRequests
        event.startsWith(EventPrefix.PAYOUT) || event.startsWith(EventPrefix.REFUND) -> NotificationTarget.Finance
        event.startsWith(EventPrefix.SUBSCRIPTION) -> NotificationTarget.Subscription
        else -> null
    }
}

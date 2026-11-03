package com.fab.wab.merchant.app.request

import com.fab.wab.merchant.app.deeplink.MerchantDeepLinkPaths
import com.fab.wab.merchant.core.common.DeepLinks
import com.fab.wab.merchant.core.notification.push.PushKeys
import com.fab.wab.merchant.core.realtime.RealtimeEvents
import com.fab.wab.merchant.feature.bookings.domain.usecase.CloseAction

/** Push keys of the close reminders (BUSINESS_DOMAIN §5.21): `reference` and `actions=COMPLETED,NO_SHOW`. */
object ClosePushKeys {
    const val REFERENCE = "reference"
    const val ACTIONS = "actions"
    const val ACTIONS_SEPARATOR = ","
}

/** A `booking.close_reminder` / `booking.close_overdue` push; [actions] = what the notification offers (server order). */
data class ClosePush(
    val bookingId: String,
    val reference: String?,
    val overdue: Boolean,
    val actions: List<CloseAction>,
)

private val CLOSE_EVENTS = setOf(RealtimeEvents.BOOKING_CLOSE_REMINDER, RealtimeEvents.BOOKING_CLOSE_OVERDUE)

/** The close reminder in [data] (FCM data / APNs userInfo); null for every other push or without a booking id. */
fun closePushOf(data: Map<String, String>): ClosePush? {
    val event = data[PushKeys.EVENT]?.takeIf { it in CLOSE_EVENTS } ?: return null
    val bookingId = data[PushKeys.BOOKING_ID]?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    val actions = data[ClosePushKeys.ACTIONS]?.split(ClosePushKeys.ACTIONS_SEPARATOR)?.mapNotNull(CloseAction::fromCode)?.distinct()
    return ClosePush(
        bookingId = bookingId,
        reference = data[ClosePushKeys.REFERENCE]?.takeIf { it.isNotBlank() },
        overdue = event == RealtimeEvents.BOOKING_CLOSE_OVERDUE,
        // An older payload without `actions` still offers both answers; the server checks permission and assignment.
        actions = actions?.takeIf { it.isNotEmpty() } ?: CloseAction.entries,
    )
}

/**
 * Where a tapped close reminder opens: the booking details (`bookings/<id>` on [webBaseUrl]); null for another push.
 * The server's `deepLink` is a relative path the link store does not accept, so the booking id decides.
 */
fun closeReminderLink(data: Map<String, String>, webBaseUrl: String): String? =
    closePushOf(data)?.let { DeepLinks.of(webBaseUrl, MerchantDeepLinkPaths.BOOKINGS, it.bookingId) }

/** Identifiers of the iOS close category (`aps.category`) and its two actions, shared with the Android receiver. */
object BookingCloseCategory {
    const val ID = "BOOKING_CLOSE"
    const val COMPLETED = "BOOKING_CLOSE_COMPLETED"
    const val NO_SHOW = "BOOKING_CLOSE_NO_SHOW"

    fun identifierOf(action: CloseAction): String = when (action) {
        CloseAction.COMPLETED -> COMPLETED
        CloseAction.NO_SHOW -> NO_SHOW
    }

    /** The close action of a notification action identifier; null for a plain tap or another action. */
    fun actionOf(identifier: String?): CloseAction? = when (identifier) {
        COMPLETED -> CloseAction.COMPLETED
        NO_SHOW -> CloseAction.NO_SHOW
        else -> null
    }
}

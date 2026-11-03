package com.fab.wab.merchant.app.request

import com.fab.wab.merchant.app.deeplink.DeepLinkStore
import com.fab.wab.merchant.core.common.AppEnvironment
import com.fab.wab.merchant.core.notification.push.PushKeys
import com.fab.wab.merchant.core.realtime.RealtimeEvents
import com.fab.wab.merchant.feature.bookings.domain.usecase.CloseAction
import com.fab.wab.merchant.feature.bookings.domain.usecase.CloseBookingUseCase
import com.fab.wab.merchant.feature.bookings.domain.usecase.CloseOutcome
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import org.koin.core.Koin
import platform.UserNotifications.UNMutableNotificationContent
import platform.UserNotifications.UNNotificationAction
import platform.UserNotifications.UNNotificationActionOptionNone
import platform.UserNotifications.UNNotificationCategory
import platform.UserNotifications.UNNotificationCategoryOptionNone
import platform.UserNotifications.UNNotificationRequest
import platform.UserNotifications.UNUserNotificationCenter

/**
 * BUSINESS_DOMAIN §5.21 on iOS (MER-086): Completed / No-show on a close reminder (category [BookingCloseCategory.ID])
 * are answered in the background; the outcome replaces the alert and, when the member may not close it or the call
 * fails, the booking details open on the next launch (and a tap on the outcome opens them too).
 */
internal class IosCloseReminders(private val koin: Koin, private val scope: CoroutineScope) {
    private val center get() = UNUserNotificationCenter.currentNotificationCenter()

    /** True when [action] is Completed / No-show on a close reminder; a plain tap goes through the generic push tap. */
    fun onResponse(data: Map<String, String>, action: String, completion: () -> Unit): Boolean {
        val push = closePushOf(data) ?: return false
        val close = BookingCloseCategory.actionOf(action) ?: return false
        scope.launch {
            try {
                val outcome = koin.get<CloseBookingUseCase>()(push.bookingId, close)
                if (outcome == CloseOutcome.OpenDetails) {
                    koin.get<DeepLinkStore>().publish(closeReminderLink(data, koin.get<AppEnvironment>().webBaseUrl))
                }
                showOutcome(push.bookingId, closeOutcomeText(outcome))
            } finally {
                completion()
            }
        }
        return true
    }

    private fun showOutcome(bookingId: String, text: String) {
        val content = UNMutableNotificationContent().apply {
            setTitle(text)
            setUserInfo(mapOf<Any?, Any?>(PushKeys.EVENT to RealtimeEvents.BOOKING_CLOSE_REMINDER, PushKeys.BOOKING_ID to bookingId))
        }
        center.addNotificationRequest(UNNotificationRequest.requestWithIdentifier(bookingId, content, null), null)
    }
}

/** The localized Completed / No-show titles, loaded before any Objective-C object is built (MER-067). */
internal data class CloseTitles(val completed: String, val noShow: String)

/** The close category; not `suspend` so no Objective-C argument crosses a suspension (MER-067). */
internal fun bookingCloseCategory(titles: CloseTitles): UNNotificationCategory {
    val completed = UNNotificationAction.actionWithIdentifier(
        BookingCloseCategory.identifierOf(CloseAction.COMPLETED),
        titles.completed,
        UNNotificationActionOptionNone,
    )
    val noShow = UNNotificationAction.actionWithIdentifier(
        BookingCloseCategory.identifierOf(CloseAction.NO_SHOW),
        titles.noShow,
        UNNotificationActionOptionNone,
    )
    return UNNotificationCategory.categoryWithIdentifier(
        BookingCloseCategory.ID,
        listOf(completed, noShow),
        emptyList<String>(),
        UNNotificationCategoryOptionNone,
    )
}

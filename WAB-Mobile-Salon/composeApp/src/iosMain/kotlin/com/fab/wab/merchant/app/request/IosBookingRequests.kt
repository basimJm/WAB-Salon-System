package com.fab.wab.merchant.app.request

import com.fab.wab.merchant.app.deeplink.DeepLinkStore
import com.fab.wab.merchant.app.deeplink.MerchantDeepLinkPaths
import com.fab.wab.merchant.app.resources.Res
import com.fab.wab.merchant.app.resources.close_completed
import com.fab.wab.merchant.app.resources.close_no_show
import com.fab.wab.merchant.app.resources.request_accept
import com.fab.wab.merchant.app.resources.request_accepted
import com.fab.wab.merchant.app.resources.request_failed
import com.fab.wab.merchant.app.resources.request_handled
import com.fab.wab.merchant.app.resources.request_reject
import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.common.AppEnvironment
import com.fab.wab.merchant.core.common.DeepLinks
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.AppearanceSettings
import com.fab.wab.merchant.core.domain.dev.MockControls
import com.fab.wab.merchant.core.notification.push.PushKeys
import com.fab.wab.merchant.core.notification.push.PushSignals
import com.fab.wab.merchant.feature.bookings.domain.repository.BookingsRepository
import com.fab.wab.merchant.feature.bookings.presentation.analytics.BookingsAnalytics
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.getString
import org.koin.core.Koin
import platform.UserNotifications.UNMutableNotificationContent
import platform.UserNotifications.UNNotificationAction
import platform.UserNotifications.UNNotificationActionOptionForeground
import platform.UserNotifications.UNNotificationActionOptionNone
import platform.UserNotifications.UNNotificationCategory
import platform.UserNotifications.UNNotificationCategoryOptionNone
import platform.UserNotifications.UNNotificationRequest
import platform.UserNotifications.UNUserNotificationCenter

/**
 * PRD M10 on iOS outside the app (MER-030): the server sends a time-sensitive alert with category
 * [BookingRequestCategory.ID]. Accept answers in the background (the outcome replaces the alert); Reject and a tap
 * open the booking in the app with the request sheet (reason picker). In the foreground the in-app sheet takes the
 * push (MER-028). Close reminders (MER-086) register their category here too ([IosCloseReminders]).
 */
class IosBookingRequests(private val koin: Koin) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val center get() = UNUserNotificationCenter.currentNotificationCenter()
    private val closeReminders = IosCloseReminders(koin, scope)

    /** Registers the Accept / Reject category in the app language, again whenever the language changes. */
    fun start() {
        koin.get<AppearanceSettings>().language.onEach { registerCategory() }.launchIn(scope)
    }

    /** True when [data] is a booking request; [action] = the notification action identifier (or the default tap). */
    fun onResponse(data: Map<String, String>, action: String, completion: () -> Unit): Boolean {
        if (closeReminders.onResponse(data, action, completion)) return true
        val bookingId = bookingRequestId(data) ?: return false
        if (action == BookingRequestCategory.ACCEPT) accept(bookingId, completion) else open(bookingId).also { completion() }
        return true
    }

    private fun open(bookingId: String) {
        koin.get<MockControls>().markBookingPending(bookingId)
        val environment = koin.get<AppEnvironment>()
        koin.get<DeepLinkStore>().publish(DeepLinks.of(environment.webBaseUrl, MerchantDeepLinkPaths.BOOKINGS, bookingId))
        PushSignals.publishReceived(requestPush(bookingId))
    }

    private fun accept(bookingId: String, completion: () -> Unit) {
        scope.launch {
            try {
                val result = koin.get<BookingsRepository>().approve(bookingId)
                val text = when {
                    result is AppResult.Success -> {
                        koin.get<AnalyticsTracker>().trackAction(
                            AnalyticsAction(
                                BookingsAnalytics.ACTION_ACCEPT,
                                analyticsParams { text(BookingsAnalytics.PARAM_CHANNEL, BookingsAnalytics.CHANNEL_NOTIFICATION) },
                            ),
                        )
                        getString(Res.string.request_accepted)
                    }
                    result is AppResult.Error && result.appError.isAlreadyHandled() -> getString(Res.string.request_handled)
                    else -> getString(Res.string.request_failed)
                }
                showOutcome(bookingId, text)
            } finally {
                completion()
            }
        }
    }

    private fun showOutcome(bookingId: String, text: String) {
        val content = UNMutableNotificationContent().apply {
            setTitle(text)
            setUserInfo(mapOf<Any?, Any?>(PushKeys.BOOKING_ID to bookingId))
        }
        center.addNotificationRequest(UNNotificationRequest.requestWithIdentifier(bookingId, content, null), null)
    }

    /**
     * Loads both titles before the first Objective-C call (MER-067): Kotlin/Native converts an Objective-C argument
     * when it is evaluated and keeps only the raw pointer across a suspension inside the argument list, so
     * `actionWithIdentifier(ID, getString(..), ..)` handed a freed NSString to UserNotifications once `getString`
     * really suspended (SIGSEGV in objc_retain at launch).
     */
    private suspend fun registerCategory() {
        val titles = BookingRequestTitles(
            accept = getString(Res.string.request_accept),
            reject = getString(Res.string.request_reject),
        )
        val closeTitles = CloseTitles(completed = getString(Res.string.close_completed), noShow = getString(Res.string.close_no_show))
        // One call registers every category (a second call would replace the first set).
        center.setNotificationCategories(setOf(bookingRequestCategory(titles), bookingCloseCategory(closeTitles)))
    }
}

/** The localized action titles of the booking request category, loaded before any Objective-C object is built. */
internal data class BookingRequestTitles(val accept: String, val reject: String)

/**
 * The Accept / Reject category. Deliberately not `suspend`: every Objective-C argument is converted and used without a
 * suspension in between (MER-067).
 */
internal fun bookingRequestCategory(titles: BookingRequestTitles): UNNotificationCategory {
    val accept = UNNotificationAction.actionWithIdentifier(
        BookingRequestCategory.ACCEPT,
        titles.accept,
        UNNotificationActionOptionNone,
    )
    val reject = UNNotificationAction.actionWithIdentifier(
        BookingRequestCategory.REJECT,
        titles.reject,
        UNNotificationActionOptionForeground,
    )
    return UNNotificationCategory.categoryWithIdentifier(
        BookingRequestCategory.ID,
        listOf(accept, reject),
        emptyList<String>(),
        UNNotificationCategoryOptionNone,
    )
}

/** Identifiers shared with the server payload (`aps.category`) and AppDelegate. */
object BookingRequestCategory {
    const val ID = "BOOKING_REQUEST"
    const val ACCEPT = "BOOKING_REQUEST_ACCEPT"
    const val REJECT = "BOOKING_REQUEST_REJECT"
}

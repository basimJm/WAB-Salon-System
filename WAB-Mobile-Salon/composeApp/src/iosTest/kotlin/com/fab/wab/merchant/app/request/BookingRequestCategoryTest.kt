package com.fab.wab.merchant.app.request

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.withContext
import kotlinx.coroutines.yield
import platform.UserNotifications.UNNotificationAction
import platform.UserNotifications.UNNotificationActionOptionForeground
import platform.UserNotifications.UNNotificationActionOptionNone
import kotlin.test.Test
import kotlin.test.assertEquals

private const val ACCEPT_TITLE = "قبول"
private const val REJECT_TITLE = "Reject"

/** MER-067: the iOS booking request category is built from titles loaded first, with the right actions. */
class BookingRequestCategoryTest {
    @Test
    fun categoryCarriesTheServerIdentifiersTitlesAndOptions() {
        val category = bookingRequestCategory(BookingRequestTitles(ACCEPT_TITLE, REJECT_TITLE))

        assertEquals(BookingRequestCategory.ID, category.identifier)
        val actions = category.actions.map { it as UNNotificationAction }
        assertEquals(listOf(BookingRequestCategory.ACCEPT, BookingRequestCategory.REJECT), actions.map { it.identifier })
        assertEquals(listOf(ACCEPT_TITLE, REJECT_TITLE), actions.map { it.title })
        assertEquals(listOf(UNNotificationActionOptionNone, UNNotificationActionOptionForeground), actions.map { it.options })
    }

    /** The launch crash path: titles that arrive after real suspensions and thread hops still reach the category intact. */
    @Test
    fun titlesLoadedAcrossSuspensionsSurviveIntoTheCategory() = runTest {
        repeat(REPEATS) {
            val titles = BookingRequestTitles(
                accept = withContext(Dispatchers.Default) { yield(); ACCEPT_TITLE + it },
                reject = withContext(Dispatchers.Default) { yield(); REJECT_TITLE + it },
            )
            val actions = bookingRequestCategory(titles).actions.map { action -> action as UNNotificationAction }
            assertEquals(listOf(ACCEPT_TITLE + it, REJECT_TITLE + it), actions.map { action -> action.title })
        }
    }

    private companion object {
        const val REPEATS = 20
    }
}

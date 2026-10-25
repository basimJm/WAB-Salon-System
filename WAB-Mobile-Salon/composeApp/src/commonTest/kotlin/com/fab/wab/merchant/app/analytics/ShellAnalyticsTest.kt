package com.fab.wab.merchant.app.analytics

import com.fab.wab.merchant.core.analytics.AnalyticsValue
import com.fab.wab.merchant.core.notification.push.PushKeys
import com.fab.wab.merchant.core.notification.push.PushNotification
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** MER-051: a tapped system notification is tracked as `push_open` with its server event. */
class ShellAnalyticsTest {
    @Test
    fun pushOpenCarriesTheEventAndWhetherItOpensAScreen() {
        val action = ShellAnalytics.pushOpen(PushNotification("t", "b", mapOf(PushKeys.EVENT to "booking.approved"), "/bookings/b1"))
        assertEquals(ShellAnalytics.ACTION_PUSH_OPEN, action.name)
        assertEquals(AnalyticsValue.Text("booking.approved"), action.params[ShellAnalytics.PARAM_EVENT])
        assertEquals(AnalyticsValue.Flag(true), action.params[ShellAnalytics.PARAM_HAS_LINK])

        val plain = ShellAnalytics.pushOpen(PushNotification("t", "b"))
        assertNull(plain.params[ShellAnalytics.PARAM_EVENT])
        assertEquals(AnalyticsValue.Flag(false), plain.params[ShellAnalytics.PARAM_HAS_LINK])
    }
}

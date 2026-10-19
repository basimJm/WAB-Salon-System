package com.fab.wab.customer.core.analytics

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class AnalyticsScreenNamesTest {

    @Test
    fun typedRoutesBecomeSnakeCaseScreenNames() {
        val typed = "com.fab.wab.customer.core.navigation.route.Screen.SalonDetails/{salonId}"
        assertEquals("salon_details", AnalyticsScreenNames.fromRoute(typed))
        assertEquals("home", AnalyticsScreenNames.fromRoute("com.fab.wab.customer.core.navigation.route.Graph.Home"))
        assertEquals("sample_details", AnalyticsScreenNames.fromRoute("route.Screen\$SampleDetails?itemId={itemId}"))
        assertEquals("otp", AnalyticsScreenNames.fromRoute("OTP"))
        assertEquals("booking_step_otp", AnalyticsScreenNames.fromRoute("BookingStepOTP"))
    }

    @Test
    fun emptyRoutesHaveNoName() {
        assertNull(AnalyticsScreenNames.fromRoute(null))
        assertNull(AnalyticsScreenNames.fromRoute(""))
        assertNull(AnalyticsScreenNames.fromRoute("/{id}"))
    }
}

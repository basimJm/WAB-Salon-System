package com.fab.wab.customer.core.navigation

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** CUS-092: a double tap on "Book now" pushed the booking flow twice (Back reopened a stale flow). */
class ScreenNavigationTest {

    @Test
    fun screenNavigationLaunchesSingleTop() {
        assertTrue(ScreenNavigation.options.shouldLaunchSingleTop())
    }

    @Test
    fun screenNavigationDoesNotPopAnything() {
        assertFalse(ScreenNavigation.options.isPopUpToInclusive())
        assertFalse(ScreenNavigation.options.shouldRestoreState())
    }
}

package com.fab.wab.merchant.core.domain.session

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class LaunchRouteTest {
    private val member = MemberProfile("m1", "s1", "Lina", MemberRole.OWNER)
    private fun signedIn(state: SalonState?) = SessionState.SignedIn(member, salonState = state)

    @Test
    fun routesFollowPrdLaunchFlow() {
        assertEquals(LaunchRoute.LOGIN, launchRouteOf(SessionState.Guest))
        assertEquals(LaunchRoute.APPLICATION_STATUS, launchRouteOf(signedIn(SalonState.APPLICATION_PENDING)))
        assertEquals(LaunchRoute.APPLICATION_STATUS, launchRouteOf(signedIn(SalonState.APPLICATION_REJECTED)))
        assertEquals(LaunchRoute.SETUP_CHECKLIST, launchRouteOf(signedIn(SalonState.APPROVED_INCOMPLETE)))
        assertEquals(LaunchRoute.HOME, launchRouteOf(signedIn(SalonState.LIVE)))
        assertEquals(LaunchRoute.HOME, launchRouteOf(signedIn(SalonState.OFFLINE)))
        assertEquals(LaunchRoute.HOME, launchRouteOf(signedIn(null)))
    }

    @Test
    fun offlineBannerOnlyForASuspendedSalon() {
        assertTrue(signedIn(SalonState.OFFLINE).showsOfflineBanner())
        assertFalse(signedIn(SalonState.LIVE).showsOfflineBanner())
        assertFalse(SessionState.Guest.showsOfflineBanner())
    }
}

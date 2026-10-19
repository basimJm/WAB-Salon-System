package com.fab.wab.customer.core.domain.session

import kotlin.test.Test
import kotlin.test.assertEquals

class LaunchDestinationTest {

    private val complete = SessionState.Guest(GuestProfile(nickname = "Lina", gender = Gender.FEMALE))
    private val registered = SessionState.SignedIn(UserProfile(id = "c1", firstName = "Omar", gender = Gender.MALE))

    @Test
    fun onboardingComesFirstOnANewDevice() {
        assertEquals(LaunchDestination.Onboarding, launchDestinationOf(onboardingSeen = false, session = registered))
        assertEquals(LaunchDestination.Onboarding, launchDestinationOf(onboardingSeen = false, session = complete))
    }

    @Test
    fun registeredAndCompleteGuestsGoHome() {
        assertEquals(LaunchDestination.Home, launchDestinationOf(onboardingSeen = true, session = registered))
        assertEquals(LaunchDestination.Home, launchDestinationOf(onboardingSeen = true, session = complete))
    }

    @Test
    fun incompleteGuestsMustFinishTheProfile() {
        assertEquals(LaunchDestination.GuestProfile, launchDestinationOf(true, SessionState.Guest()))
        assertEquals(LaunchDestination.GuestProfile, launchDestinationOf(true, SessionState.Guest(GuestProfile(nickname = "Lina"))))
        assertEquals(LaunchDestination.GuestProfile, launchDestinationOf(true, SessionState.Guest(GuestProfile(" ", Gender.MALE))))
    }
}

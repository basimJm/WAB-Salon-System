package com.fab.wab.customer.core.domain.session

/** Where the launch flow lands after the config gate (PRD §4.2). */
enum class LaunchDestination {
    Onboarding,

    /** S02 — mandatory until nickname and gender are saved; registered users never see it. */
    GuestProfile,
    Home,
}

/**
 * PRD §4.2 / §4.3: onboarding once per install, then registered → Home, guest with nickname + gender → Home,
 * anyone else → S02 on every launch (and after a session expiry that leaves the guest profile incomplete).
 */
fun launchDestinationOf(onboardingSeen: Boolean, session: SessionState): LaunchDestination = when {
    !onboardingSeen -> LaunchDestination.Onboarding
    session.isSignedIn -> LaunchDestination.Home
    session is SessionState.Guest && session.profile.isComplete -> LaunchDestination.Home
    else -> LaunchDestination.GuestProfile
}

package com.fab.wab.merchant.core.domain.session

/** Where the app opens after the config gate (PRD §4.3 launch flow). */
enum class LaunchRoute { LOGIN, APPLICATION_STATUS, SETUP_CHECKLIST, HOME }

/**
 * PRD §4.3: no session → login; application pending / rejected → application status; approved but incomplete →
 * setup checklist; live / offline → home. A member whose salon state is not known yet opens home (the state
 * arrives with the launch refresh and re-routes if needed).
 */
fun launchRouteOf(session: SessionState): LaunchRoute = when (session) {
    SessionState.Guest -> LaunchRoute.LOGIN
    is SessionState.SignedIn -> when (session.salonState) {
        SalonState.APPLICATION_PENDING, SalonState.APPLICATION_REJECTED -> LaunchRoute.APPLICATION_STATUS
        SalonState.APPROVED_INCOMPLETE -> LaunchRoute.SETUP_CHECKLIST
        SalonState.LIVE, SalonState.OFFLINE, null -> LaunchRoute.HOME
    }
}

/** PRD §3: the persistent "your salon is offline" banner shows on every screen while the salon is suspended. */
fun SessionState.showsOfflineBanner(): Boolean = (this as? SessionState.SignedIn)?.salonState == SalonState.OFFLINE

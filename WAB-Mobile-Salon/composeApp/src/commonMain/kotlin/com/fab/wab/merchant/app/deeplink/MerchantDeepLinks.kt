package com.fab.wab.merchant.app.deeplink

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import com.fab.wab.merchant.core.common.DeepLink
import com.fab.wab.merchant.core.domain.session.LaunchRoute
import com.fab.wab.merchant.core.navigation.route.Screen

/** Paths of the merchant website the app opens (`<merchant-domain>/<path>`, App Links / Universal Links). */
object MerchantDeepLinkPaths {
    /** PRD §4.5: "Register your salon with us" in the customer app. */
    const val REGISTER = "register"

    /** `bookings/<id>`: a booking (notification links). */
    const val BOOKINGS = "bookings"
    internal const val BOOKING_SEGMENTS = 2
}

/**
 * Where an opened link goes for the current launch route; null = nothing to open (the link is dropped).
 * `/register` starts the registration only for a guest (a phone belongs to one salon, so a signed-in member stays
 * where they are); `/bookings/<id>` opens the booking only once the member is on the home route.
 */
fun deepLinkTarget(link: DeepLink, route: LaunchRoute): Screen? = when (link.first) {
    MerchantDeepLinkPaths.REGISTER -> if (route == LaunchRoute.LOGIN) Screen.Login(register = true) else null
    MerchantDeepLinkPaths.BOOKINGS -> link.segments.takeIf {
        route == LaunchRoute.HOME && it.size == MerchantDeepLinkPaths.BOOKING_SEGMENTS
    }
        ?.let { Screen.BookingDetails(it[1]) }
    else -> null
}

/** Routes the pending link of [store] once the NavHost is on screen, then consumes it. */
@Composable
fun DeepLinkEffect(store: DeepLinkStore, route: LaunchRoute, navController: NavHostController) {
    val link by store.link.collectAsStateWithLifecycle()
    LaunchedEffect(link, route) {
        val current = link ?: return@LaunchedEffect
        deepLinkTarget(current, route)?.let { target -> navController.navigate(target) { launchSingleTop = true } }
        store.consume(current)
    }
}

package com.fab.wab.customer.app.push

import com.fab.wab.customer.core.common.DeepLinks
import com.fab.wab.customer.core.notification.push.PushNotification

/** Where a tapped system push lands (PRD §10.2): a salon link, S19 for registered users, Home for guests. */
sealed interface PushTapDestination {
    data class Link(val url: String) : PushTapDestination
    data object Notifications : PushTapDestination
    data object Home : PushTapDestination
}

fun pushTapDestinationOf(notification: PushNotification, signedIn: Boolean, webBaseUrl: String): PushTapDestination {
    val link = notification.deepLink?.takeIf { DeepLinks.parse(it, webBaseUrl) != null }
    return when {
        link != null -> PushTapDestination.Link(link)
        signedIn -> PushTapDestination.Notifications
        else -> PushTapDestination.Home
    }
}

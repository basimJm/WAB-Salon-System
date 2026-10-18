package com.fab.wab.customer.core.navigation.route

import kotlinx.serialization.Serializable

/** One graph per bottom-navigation root (PRD §7.1): Home, Favorites, Bookings, Profile. */
sealed interface Graph {
    @Serializable data object Home : Graph
    @Serializable data object Favorites : Graph
    @Serializable data object Bookings : Graph
    @Serializable data object Profile : Graph

    /** Login / Register / OTP (PRD S11–S13); reachable from anywhere, shown without the tab bar. */
    @Serializable data object Auth : Graph
}

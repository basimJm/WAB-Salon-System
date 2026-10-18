package com.fab.wab.customer.core.navigation.route

import kotlinx.serialization.Serializable

sealed interface Screen {
    @Serializable
    data object Home : Screen

    @Serializable
    data class SampleDetails(val itemId: Int) : Screen

    @Serializable
    data object Favorites : Screen

    @Serializable
    data object Bookings : Screen

    @Serializable
    data object Profile : Screen
}

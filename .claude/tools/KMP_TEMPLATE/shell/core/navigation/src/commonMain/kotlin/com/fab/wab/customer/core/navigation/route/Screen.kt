package com.fab.wab.customer.core.navigation.route

import kotlinx.serialization.Serializable

/** Typed destinations; every feature adds its screens here. */
sealed interface Screen {
    @Serializable
    data object Home : Screen

    @Serializable
    data class SampleDetails(val itemId: Int) : Screen
}

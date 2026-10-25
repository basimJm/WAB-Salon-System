package com.fab.wab.merchant.core.navigation.route

import kotlinx.serialization.Serializable

/** One graph per navigation root: the auth flow, the salon application flow and the five tabs (PRD §8.1). */
sealed interface Graph {
    @Serializable data object Auth : Graph

    @Serializable data object Onboarding : Graph

    @Serializable data object Setup : Graph

    @Serializable data object Home : Graph

    @Serializable data object Bookings : Graph

    @Serializable data object Calendar : Graph

    @Serializable data object Salon : Graph

    @Serializable data object More : Graph
}

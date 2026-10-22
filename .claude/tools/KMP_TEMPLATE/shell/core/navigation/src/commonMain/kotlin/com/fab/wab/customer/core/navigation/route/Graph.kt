package com.fab.wab.customer.core.navigation.route

import kotlinx.serialization.Serializable

/** One graph per navigation root; add a graph per bottom-bar tab or flow. */
sealed interface Graph {
    @Serializable data object Home : Graph
}

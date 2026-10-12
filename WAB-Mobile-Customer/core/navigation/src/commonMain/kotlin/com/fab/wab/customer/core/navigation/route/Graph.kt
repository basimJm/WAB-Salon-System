package com.fab.wab.customer.core.navigation.route

import kotlinx.serialization.Serializable

sealed interface Graph {
    @Serializable data object Home : Graph
}

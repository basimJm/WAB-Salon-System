package com.fab.wab.customer.designsystem.components.navigation

import com.fab.wab.customer.core.navigation.route.Graph
import org.jetbrains.compose.resources.DrawableResource
import org.jetbrains.compose.resources.StringResource

data class AppNavDestination(
    val graph: Graph,
    val labelRes: StringResource,
    val iconRes: DrawableResource,
)

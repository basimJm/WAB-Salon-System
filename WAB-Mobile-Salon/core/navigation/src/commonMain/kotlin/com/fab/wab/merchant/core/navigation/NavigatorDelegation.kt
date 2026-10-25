package com.fab.wab.merchant.core.navigation

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import com.fab.wab.merchant.core.navigation.route.Graph
import com.fab.wab.merchant.core.navigation.route.Screen

class NavigatorDelegation(override val navController: NavHostController) : Navigator {
    /** Features register their own graphs; the delegate only provides the shared navigation helpers. */
    override fun registerGraph(navGraphBuilder: NavGraphBuilder) = Unit

    override fun navigateAndClearBackstack(graph: Graph) {
        navController.navigate(graph) {
            popUpTo(navController.graph.id) {
                inclusive = true
            }
        }
    }

    override fun navigateTo(graph: Graph) {
        navController.navigate(graph)
    }

    override fun navigateTo(screen: Screen) {
        navController.navigate(screen)
    }

    override fun navigateBack() {
        navController.popBackStack()
    }

    override fun navigateBack(
        destination: Screen,
        inclusive: Boolean
    ) {
        navController.popBackStack(destination, inclusive)
    }

    override fun navigateUp() {
        navController.navigateUp()
    }
}

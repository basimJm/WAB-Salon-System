package com.fab.wab.customer.app.navigation

import androidx.compose.ui.graphics.vector.ImageVector
import com.fab.wab.customer.core.navigation.route.Graph
import com.fab.wab.customer.designsystem.icons.AppIcons

/** The four bottom-navigation roots of PRD §7.1, in display order; Home is the default tab. */
enum class RootTab(val id: String, val graph: Graph, val icon: ImageVector) {
    Home("home", Graph.Home, AppIcons.Home),
    Favorites("favorites", Graph.Favorites, AppIcons.Favorite),
    Bookings("bookings", Graph.Bookings, AppIcons.Bookings),
    Profile("profile", Graph.Profile, AppIcons.Profile),
    ;

    /** Serialized route name of the tab's graph, as `NavDestination.route` reports it. */
    val routeName: String = graph::class.qualifiedName.orEmpty()

    companion object {
        val DEFAULT: RootTab = Home

        fun fromId(id: String?): RootTab = entries.firstOrNull { it.id == id } ?: DEFAULT

        /**
         * The tab that owns the current destination: the first route in the back-stack hierarchy
         * (destination first, then its parents) that is a root graph; Home when nothing matches.
         */
        fun forRoutes(hierarchyRoutes: List<String?>): RootTab = forRoutesOrNull(hierarchyRoutes) ?: DEFAULT

        /** Null when the destination belongs to no tab (auth, full-screen flows): the tab bar hides. */
        fun forRoutesOrNull(hierarchyRoutes: List<String?>): RootTab? =
            hierarchyRoutes.firstNotNullOfOrNull { route -> entries.firstOrNull { it.routeName == route } }
    }
}

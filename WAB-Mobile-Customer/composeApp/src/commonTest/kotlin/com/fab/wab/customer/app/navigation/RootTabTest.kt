package com.fab.wab.customer.app.navigation

import kotlin.test.Test
import kotlin.test.assertEquals

class RootTabTest {

    @Test
    fun homeIsTheDefaultAndFirstTab() {
        assertEquals(RootTab.Home, RootTab.DEFAULT)
        assertEquals(RootTab.Home, RootTab.entries.first())
        assertEquals(listOf("home", "favorites", "bookings", "profile"), RootTab.entries.map { it.id })
    }

    @Test
    fun idsAndRouteNamesAreUnique() {
        assertEquals(RootTab.entries.size, RootTab.entries.map { it.id }.toSet().size)
        assertEquals(RootTab.entries.size, RootTab.entries.map { it.routeName }.toSet().size)
    }

    @Test
    fun unknownIdFallsBackToHome() {
        assertEquals(RootTab.Profile, RootTab.fromId("profile"))
        assertEquals(RootTab.Home, RootTab.fromId("settings"))
        assertEquals(RootTab.Home, RootTab.fromId(null))
    }

    @Test
    fun selectedTabComesFromTheFirstRootGraphInTheHierarchy() {
        val screenInBookings = listOf("some.Screen", RootTab.Bookings.routeName, "root")
        assertEquals(RootTab.Bookings, RootTab.forRoutes(screenInBookings))
        assertEquals(RootTab.Home, RootTab.forRoutes(listOf("unknown", null)))
        assertEquals(RootTab.Home, RootTab.forRoutes(emptyList()))
    }
}

package com.fab.wab.merchant.feature.team.domain

import com.fab.wab.merchant.core.domain.permission.Permission
import kotlin.test.Test
import kotlin.test.assertEquals

class PermissionGroupsTest {

    @Test
    fun everyGrantableKeyIsInExactlyOneGroup() {
        val grouped = PermissionGroup.entries.flatMap { it.permissions }
        assertEquals(Permission.entries.toSet(), grouped.toSet())
        assertEquals(grouped.size, grouped.toSet().size)
    }

    @Test
    fun toggleAddsAndRemoves() {
        val own = setOf(Permission.BOOKINGS_VIEW_OWN, Permission.REVIEWS_VIEW)
        assertEquals(setOf(Permission.REVIEWS_VIEW), own.toggled(Permission.BOOKINGS_VIEW_OWN))
        assertEquals(own + Permission.FINANCE_VIEW, own.toggled(Permission.FINANCE_VIEW))
    }
}

package com.fab.wab.merchant.feature.team.presentation

import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.feature.team.presentation.screen.PERMISSION_COPY
import kotlin.test.Test
import kotlin.test.assertEquals

/** Every grantable key (PRD §6.2) has a title and a description on the permissions editor. */
class PermissionCopyTest {
    @Test
    fun everyPermissionHasItsCopy() {
        assertEquals(Permission.entries.toSet(), PERMISSION_COPY.keys)
        assertEquals(PERMISSION_COPY.size, PERMISSION_COPY.values.toSet().size, "no two keys share a text")
    }
}

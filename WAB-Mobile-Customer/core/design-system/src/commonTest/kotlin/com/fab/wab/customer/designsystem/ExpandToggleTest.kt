package com.fab.wab.customer.designsystem

import com.fab.wab.customer.designsystem.components.text.expandToggleVisible
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** CUS-092: S06 and S07 showed "more" under one-line texts; the toggle follows real overflow only. */
class ExpandToggleTest {

    @Test
    fun shortTextHasNoToggle() {
        assertFalse(expandToggleVisible(overflows = false, expanded = false))
    }

    @Test
    fun overflowingTextOffersMore() {
        assertTrue(expandToggleVisible(overflows = true, expanded = false))
    }

    @Test
    fun expandedTextOffersLess() {
        assertTrue(expandToggleVisible(overflows = false, expanded = true))
    }
}

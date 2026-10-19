package com.fab.wab.customer.feature.booking.domain

import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.model.StaffChoice
import com.fab.wab.customer.feature.booking.domain.model.hasStaffOverlap
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class StaffRulesTest {
    private val main = DraftPerson(
        "Sara", serviceIds = listOf("a"), start = "2026-10-20T07:00:00Z", staff = StaffChoice.Specific("m1", "Omar"),
    )
    private val companion = DraftPerson("Lina", serviceIds = listOf("a"))

    @Test
    fun sameStaffAtOverlappingTimesIsBlockedOtherwiseAllowed() {
        val persons = listOf(main, companion)
        assertTrue(hasStaffOverlap(persons, 1, "m1", "2026-10-20T07:30:00Z", 30) { 60 })
        assertFalse(hasStaffOverlap(persons, 1, "m1", "2026-10-20T08:00:00Z", 30) { 60 })
        assertFalse(hasStaffOverlap(persons, 1, "m2", "2026-10-20T07:30:00Z", 30) { 60 })
        assertFalse(hasStaffOverlap(persons, 0, "m1", "2026-10-20T07:30:00Z", 30) { 60 })
    }
}

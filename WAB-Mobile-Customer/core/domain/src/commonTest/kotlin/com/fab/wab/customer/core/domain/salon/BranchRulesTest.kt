package com.fab.wab.customer.core.domain.salon

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class BranchRulesTest {

    private fun branch(id: String, isMain: Boolean = false) = SalonBranch(
        id = id, name = id, isMain = isMain, locationText = null, location = null, phone = null, whatsapp = null,
        isOpenNow = true, todayHours = null, closedReason = null, weeklySchedule = emptyList(), upcomingClosures = emptyList(),
    )

    private fun service(id: String, branchId: String?) = SalonService(
        id = id, catalogServiceId = "c-$id", name = id, imageUrl = null, description = null, price = "10",
        durationMinutes = 30, mediaUrls = emptyList(), branchId = branchId,
    )

    @Test
    fun branchCountAboveOneMeansSeveralBranches() {
        assertFalse(BranchRules.hasSeveralBranches(0))
        assertFalse(BranchRules.hasSeveralBranches(1))
        assertTrue(BranchRules.hasSeveralBranches(2))
    }

    @Test
    fun initialBranchPrefersRequestedThenMainThenFirst() {
        val branches = listOf(branch("a"), branch("main", isMain = true), branch("c"))
        assertEquals("c", BranchRules.initialBranch(branches, "c")?.id)
        assertEquals("main", BranchRules.initialBranch(branches, "unknown")?.id)
        assertEquals("main", BranchRules.initialBranch(branches, null)?.id)
        assertEquals("a", BranchRules.initialBranch(listOf(branch("a"), branch("b")), null)?.id)
        assertNull(BranchRules.initialBranch(emptyList(), "a"))
    }

    @Test
    fun bookingSkipsTheBranchStepOnlyForOneBranchOrAValidRequestedOne() {
        assertEquals("only", BranchRules.preselectedForBooking(listOf(branch("only")), null)?.id)
        assertEquals("only", BranchRules.preselectedForBooking(listOf(branch("only")), "other")?.id)
        val several = listOf(branch("a", isMain = true), branch("b"))
        assertNull(BranchRules.preselectedForBooking(several, null))
        assertNull(BranchRules.preselectedForBooking(several, "gone"))
        assertEquals("b", BranchRules.preselectedForBooking(several, "b")?.id)
        assertNull(BranchRules.preselectedForBooking(emptyList(), null))
    }

    @Test
    fun servicesAndStaffAreFilteredByBranchAndUnbranchedItemsStay() {
        val details = SalonDetailsFixture.details(
            services = listOf(service("s1", "a"), service("s2", "b"), service("s3", null)),
            staff = listOf(
                StaffPreview("m1", "Omar", null, StaffStatus.ON_DUTY, branchId = "a"),
                StaffPreview("m2", "Ali", null, StaffStatus.ON_DUTY, branchId = "b"),
            ),
        )
        assertEquals(listOf("s1", "s3"), details.servicesOf("a").map { it.id })
        assertEquals(listOf("s2", "s3"), details.servicesOf("b").map { it.id })
        assertEquals(listOf("s1", "s2", "s3"), details.servicesOf(null).map { it.id })
        assertEquals(listOf("m2"), details.staffOf("b").map { it.id })
    }

    @Test
    fun salonAtABranchTakesItsPlaceAndKeepsSalonWideFacts() {
        val details = SalonDetailsFixture.details(services = listOf(service("s1", "a"), service("s2", "b")), staff = emptyList())
        val khalda = branch("b").copy(locationText = "Khalda", phone = "+962790000002", isOpenNow = false, closedReason = "Holiday")
        val view = details.forBranch(khalda)
        assertEquals("Khalda", view.locationText)
        assertEquals("+962790000002", view.phone)
        assertFalse(view.isOpenNow)
        assertEquals("Holiday", view.closedReason)
        assertEquals(listOf("s2"), view.services.map { it.id })
        assertEquals(details.name, view.name)
        assertEquals(details.reviews, view.reviews)
        assertEquals(details, details.forBranch(null))
    }
}

private object SalonDetailsFixture {
    fun details(services: List<SalonService>, staff: List<StaffPreview>) = SalonDetails(
        id = "s", name = "Salon", businessType = BusinessType.SALON, audience = null, coverUrl = null, profileImageUrl = null,
        description = null, locationText = null,
        location = null, phone = null, whatsapp = null, rating = RatingSummary(0f, 0), isOpenNow = true, todayHours = null,
        closedReason = null, weeklySchedule = emptyList(), upcomingClosures = emptyList(), staff = staff, services = services,
        gallery = emptyList(), isFavorite = false, reviews = ReviewsPreview(RatingSummary(0f, 0), emptyList()),
    )
}

package com.fab.wab.merchant.core.data.mock

/** Ready-made members for the dev scenario switcher: every role with a typical permission set (PRD §6.2). */
object MockPresets {
    const val OWNER = "OWNER"
    const val MANAGER = "MANAGER"
    const val EMPLOYEE = "EMPLOYEE"

    /** The 16 grantable keys of `MemberProfile.permissions`. */
    val ALL_PERMISSIONS: Set<String> = setOf(
        "DASHBOARD_VIEW", "BOOKINGS_VIEW_ALL", "BOOKINGS_VIEW_OWN", "BOOKINGS_RESPOND", "BOOKINGS_OPERATE", "BOOKINGS_CREATE",
        "SALON_PROFILE_MANAGE", "GALLERY_MANAGE", "WORKING_HOURS_MANAGE", "SERVICES_MANAGE", "STAFF_MANAGE",
        "POLICIES_MANAGE", "REVIEWS_VIEW", "STATISTICS_VIEW", "FINANCE_VIEW", "SUBSCRIPTION_VIEW",
    )

    val owner = MockMember(OWNER, ALL_PERMISSIONS)
    val manager = MockMember(
        MANAGER,
        setOf(
            "DASHBOARD_VIEW", "BOOKINGS_VIEW_ALL", "BOOKINGS_RESPOND", "BOOKINGS_OPERATE", "BOOKINGS_CREATE", "SERVICES_MANAGE",
            "STAFF_MANAGE",
        ),
    )
    val employee = MockMember(EMPLOYEE, setOf("BOOKINGS_VIEW_OWN", "BOOKINGS_OPERATE"))
    val noPermissions = MockMember(EMPLOYEE, emptySet())

    val members: List<MockMember> = listOf(owner, manager, employee, noPermissions)
}

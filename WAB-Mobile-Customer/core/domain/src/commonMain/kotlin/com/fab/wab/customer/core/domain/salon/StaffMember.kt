package com.fab.wab.customer.core.domain.salon

/** BUSINESS_DOMAIN `MemberRole`. */
enum class MemberRole(val code: String) {
    OWNER("OWNER"), MANAGER("MANAGER"), EMPLOYEE("EMPLOYEE"),
    ;

    companion object {
        fun fromCode(code: String?): MemberRole = entries.firstOrNull { it.code.equals(code?.trim(), ignoreCase = true) } ?: EMPLOYEE
    }
}

/** A working day of a staff member; null hours mean the salon's hours (BUSINESS_DOMAIN staff `workingDays`). */
data class WorkingDay(val day: DayOfWeek?, val hours: OpeningHours?)

/** A service the member provides; [brideOnly] = VIP, bookable only for a bride (SRV-170). */
data class StaffServiceRef(val id: String, val catalogServiceId: String, val name: String, val brideOnly: Boolean = false)

/** `GET /salons/{id}/staff/{memberId}` (PRD S07 staff sheet). */
data class StaffMember(
    val id: String,
    val firstName: String,
    val photoUrl: String?,
    val status: StaffStatus,
    val role: MemberRole,
    val rating: RatingSummary,
    val bio: String?,
    val yearsOfExperience: Int?,
    val customersCount: Int,
    val workingDays: List<WorkingDay>,
    val services: List<StaffServiceRef>,
    val reviews: ReviewsPreview,
)

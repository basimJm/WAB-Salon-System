package com.fab.wab.merchant.core.domain.session

/** Member role of PRD §4.1 / §6: a label plus the default permission template; access is the permission set. */
enum class MemberRole {
    OWNER,
    MANAGER,
    EMPLOYEE,
    ;

    companion object {
        fun fromCode(code: String?): MemberRole? = entries.firstOrNull { it.name == code?.trim()?.uppercase() }
    }
}

/** Salon lifecycle of PRD §4.2. */
enum class SalonState {
    APPLICATION_PENDING,
    APPLICATION_REJECTED,
    APPROVED_INCOMPLETE,
    LIVE,
    OFFLINE,
    ;

    companion object {
        fun fromCode(code: String?): SalonState? = entries.firstOrNull { it.name == code?.trim()?.uppercase() }
    }
}

/**
 * The signed-in member (PRD §5 `member_id`, `salon_id`, `member_role`); the id keys analytics and crash reports.
 * [branchId] = the branch of a manager / employee (BUSINESS_DOMAIN §6 branch scope); null for the owner, and null for
 * a branch member until the server reports it (the server scopes every call to the member's branch either way).
 */
data class MemberProfile(
    val id: String,
    val salonId: String,
    val firstName: String,
    val role: MemberRole,
    val branchId: String? = null,
) {
    val scope: MemberScope get() = if (role == MemberRole.OWNER) MemberScope.AllBranches else MemberScope.OneBranch(branchId)
}

/** BUSINESS_DOMAIN §6 branch scope: the owner works across every branch; managers and employees inside one branch. */
sealed interface MemberScope {
    data object AllBranches : MemberScope

    data class OneBranch(val branchId: String?) : MemberScope
}

/** Who is using the app right now; derived from the session store, never built by features. */
sealed interface SessionState {
    val isSignedIn: Boolean

    data object Guest : SessionState {
        override val isSignedIn: Boolean get() = false
    }

    /**
     * [permissions] = cached permission keys (PRD §5 `permissions`, refreshed from the server; the owner holds all),
     * [salonState] = cached lifecycle state (PRD §5 `salon_state`; null until the server reported it).
     */
    data class SignedIn(
        val member: MemberProfile,
        val permissions: Set<String> = emptySet(),
        val salonState: SalonState? = null,
    ) : SessionState {
        override val isSignedIn: Boolean get() = true
    }
}

package com.fab.wab.merchant.core.domain.branch

import com.fab.wab.merchant.core.domain.session.MemberScope
import com.fab.wab.merchant.core.domain.session.SessionState
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.onEach

/**
 * The owner's branch switcher (BUSINESS_DOMAIN §6 branch scope): `null` = "All branches", else one branch id. One
 * instance for the whole app, so bookings, calendar, hours, services, team and finance follow the same choice.
 * Managers and employees never choose: the server scopes every call to their branch.
 */
class BranchSelection {
    private val state = MutableStateFlow<String?>(null)

    val selected: StateFlow<String?> = state.asStateFlow()

    fun select(branchId: String?) {
        state.value = branchId
    }
}

/** Everything a branch-scoped screen needs: who is signed in, the salon's branches and the owner's choice. */
data class BranchScope(
    val member: MemberScope = MemberScope.OneBranch(null),
    val branches: List<Branch> = emptyList(),
    val selected: String? = null,
) {
    /** `branchId` for list / filter calls (null = all branches, or the member's own branch on the server). */
    val filter: String? get() = branchFilterOf(member, selected, branches)

    /** The branch a per-branch editor (hours, services) addresses; null = the member's branch (salon-level calls). */
    val edited: String? get() = editedBranchOf(member, selected, branches)
    val showsSwitcher: Boolean get() = showsBranchSwitcher(member, branches)
    val isOwner: Boolean get() = member == MemberScope.AllBranches
}

/** Live [BranchScope] from the session, the shared branch list and the switcher; loads the list once for the owner. */
fun branchScopeOf(session: Flow<SessionState>, repository: BranchesRepository, selection: BranchSelection): Flow<BranchScope> =
    combine(session, repository.branches, selection.selected) { state, branches, selected ->
        val member = (state as? SessionState.SignedIn)?.member?.scope ?: MemberScope.OneBranch(null)
        BranchScope(member, branches, selected)
    }.distinctUntilChanged().onEach { scope ->
        if (scope.isOwner && scope.branches.isEmpty()) repository.refresh()
    }

/** The `branchId` query / path a scoped call sends: the owner's choice (when it still exists), nothing for branch members. */
fun branchFilterOf(scope: MemberScope, selected: String?, branches: List<Branch>): String? = when (scope) {
    MemberScope.AllBranches -> selected?.takeIf { id -> branches.any { it.id == id } }
    is MemberScope.OneBranch -> null
}

/** The switcher shows only for the owner of a salon with more than one branch (closed ones keep their history). */
fun showsBranchSwitcher(scope: MemberScope, branches: List<Branch>): Boolean =
    scope == MemberScope.AllBranches && branches.size > 1

/**
 * The branch a per-branch screen (hours, services) edits: the owner's choice, else the main branch; branch members edit
 * their own branch through the salon-level endpoints (null).
 */
fun editedBranchOf(scope: MemberScope, selected: String?, branches: List<Branch>): String? = when (scope) {
    MemberScope.AllBranches -> branchFilterOf(scope, selected, branches) ?: branches.firstOrNull { it.isMain }?.id
    is MemberScope.OneBranch -> null
}

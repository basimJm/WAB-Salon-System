package com.fab.wab.merchant.core.domain.branch

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.session.MemberScope
import com.fab.wab.merchant.core.domain.session.SessionState
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged

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

/**
 * Live [BranchScope] from the session, the shared branch list and the switcher. The list is reloaded once per collector
 * for each signed-in owner and trusted only after that reload succeeds, so a screen never shows another account's (or an
 * outdated) branch list; branch members get no list (they never switch).
 */
fun branchScopeOf(session: Flow<SessionState>, repository: BranchesRepository, selection: BranchSelection): Flow<BranchScope> {
    var loadedFor: String? = null
    var trusted = false
    return combine(session, repository.branches, selection.selected) { state, _, selected ->
        val member = (state as? SessionState.SignedIn)?.member
        val scope = member?.scope ?: MemberScope.OneBranch(null)
        val owner = member != null && scope == MemberScope.AllBranches
        if (owner && loadedFor != member.id) {
            loadedFor = member.id
            trusted = repository.refresh() is AppResult.Success
        }
        val current = if (owner && trusted) repository.branches.value else emptyList()
        BranchScope(scope, current, selected)
    }.distinctUntilChanged()
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

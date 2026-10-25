package com.fab.wab.merchant.core.domain.branch

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.FieldError
import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.MemberScope
import com.fab.wab.merchant.core.domain.session.SessionState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

internal fun branch(id: String, main: Boolean = false, status: BranchStatus = BranchStatus.ACTIVE, en: String = id) = Branch(
    id = id, name = BranchName(ar = "فرع $id", en = en), isMain = main, status = status, location = null, locationText = null,
    cityId = null, areaId = null, phone = null, whatsapp = null, offlineReason = null, missing = emptyList(),
)

/** Starts empty; [refresh] publishes [server]. */
private class ListRepository(private val server: List<Branch>) : BranchesRepository {
    private val state = MutableStateFlow(emptyList<Branch>())
    var refreshes = 0
    override val branches: StateFlow<List<Branch>> = state
    override suspend fun refresh(): AppResult<List<Branch>> {
        refreshes += 1
        state.value = server
        return AppResult.Success(server)
    }
    override suspend fun create(form: BranchForm): AppResult<Branch> = AppResult.Success(server.first())
    override suspend fun update(id: String, form: BranchForm): AppResult<Branch> = AppResult.Success(server.first())
    override suspend fun setMain(id: String): AppResult<Branch> = AppResult.Success(server.first())
    override suspend fun setOffline(id: String, reason: String): AppResult<Branch> = AppResult.Success(server.first())
    override suspend fun setOnline(id: String): AppResult<Branch> = AppResult.Success(server.first())
    override suspend fun close(id: String): AppResult<Branch> = AppResult.Success(server.first())
}

/** MER-062: branch rules of BUSINESS_DOMAIN §5.16 and the owner switcher of §6. */
class BranchesTest {

    @Test
    fun transitionsFollowTheLifecycle() {
        val main = branch("a", main = true)
        assertFalse(main.canBecomeMain)
        assertFalse(main.canClose, "the main branch needs a new main before closing")
        assertTrue(main.canGoOffline)
        val offline = branch("b", status = BranchStatus.OFFLINE)
        assertTrue(offline.canGoOnline && offline.canBecomeMain && offline.canClose)
        assertFalse(offline.canGoOffline)
        val closed = branch("c", status = BranchStatus.CLOSED)
        assertFalse(closed.canBecomeMain || closed.canClose || closed.canGoOnline || closed.canGoOffline)
        assertEquals(BranchStatus.CLOSED, BranchStatus.fromCode("SOMETHING_NEW"))
    }

    @Test
    fun namesFollowTheAppLanguageWithFallback() {
        val name = BranchName(ar = "شارع مكة", en = "Mecca Street")
        assertEquals("شارع مكة", name.localized("ar_JO"))
        assertEquals("Mecca Street", name.localized("en"))
        assertEquals("Mecca Street", BranchName(ar = " ", en = "Mecca Street").localized("ar"))
    }

    @Test
    fun listIsOrderedMainFirstThenByStatus() {
        val ordered = listOf(branch("z", status = BranchStatus.CLOSED), branch("y"), branch("x", main = true)).ordered()
        assertEquals(listOf("x", "y", "z"), ordered.map { it.id })
    }

    @Test
    fun formValidationFollowsTheContract() {
        assertEquals(BranchField.entries.toSet() - BranchField.WHATSAPP, branchFormErrors(BranchForm()))
        val valid = BranchForm("مكة", "Mecca", LocationData(1.0, 2.0), "St 1", "c1", "a1", "+962 79-123-4567")
        assertTrue(branchFormErrors(valid).isEmpty())
        assertEquals(setOf(BranchField.WHATSAPP), branchFormErrors(valid.copy(whatsapp = "0791")))
        assertEquals(setOf(BranchField.NAME_EN), branchFormErrors(valid.copy(nameEn = "x".repeat(BranchLimits.NAME_MAX + 1))))
    }

    @Test
    fun closeConflictCarriesTheBlockingBookings() {
        val conflict = AppError.ServerError(
            ErrorCode.BRANCH_HAS_UPCOMING_BOOKINGS, 409, null, listOf(FieldError("b1", "", ""), FieldError("b2", "", ""), FieldError("b1", "", "")),
        )
        assertEquals(listOf("b1", "b2"), conflict.blockingBookingIds())
        assertNull(AppError.ServerError(ErrorCode.LAST_BRANCH, 422, null).blockingBookingIds())
    }

    @Test
    fun ownerFiltersByTheChosenBranchAndMembersNever() {
        val branches = listOf(branch("a", main = true), branch("b"))
        assertEquals("b", branchFilterOf(MemberScope.AllBranches, "b", branches))
        assertNull(branchFilterOf(MemberScope.AllBranches, "gone", branches), "a removed choice falls back to all")
        assertNull(branchFilterOf(MemberScope.OneBranch("b"), "b", branches), "the server scopes branch members")
        assertTrue(showsBranchSwitcher(MemberScope.AllBranches, branches))
        assertFalse(showsBranchSwitcher(MemberScope.AllBranches, branches.take(1)))
        assertFalse(showsBranchSwitcher(MemberScope.OneBranch("a"), branches))
        assertEquals("a", editedBranchOf(MemberScope.AllBranches, null, branches))
        assertEquals("b", editedBranchOf(MemberScope.AllBranches, "b", branches))
        assertNull(editedBranchOf(MemberScope.OneBranch("b"), null, branches))
    }

    @Test
    fun scopeFlowLoadsBranchesOnceForTheOwner() = runTest {
        val repository = ListRepository(listOf(branch("a", main = true), branch("b")))
        val selection = BranchSelection().apply { select("b") }
        val owner = SessionState.SignedIn(MemberProfile("m1", "s1", "Huda", MemberRole.OWNER))
        val scope = branchScopeOf(flowOf(owner), repository, selection).first { it.branches.isNotEmpty() }
        assertEquals(1, repository.refreshes)
        assertEquals("b", scope.filter)
        assertTrue(scope.showsSwitcher)
        val manager = SessionState.SignedIn(MemberProfile("m2", "s1", "Rami", MemberRole.MANAGER, "b"))
        val managerScope = branchScopeOf(flowOf(manager), ListRepository(emptyList()), selection).first()
        assertNull(managerScope.filter)
        assertFalse(managerScope.showsSwitcher)
    }

    @Test
    fun selectionIsShared() {
        val selection = BranchSelection()
        assertNull(selection.selected.value)
        selection.select("b")
        assertEquals("b", selection.selected.value)
    }
}

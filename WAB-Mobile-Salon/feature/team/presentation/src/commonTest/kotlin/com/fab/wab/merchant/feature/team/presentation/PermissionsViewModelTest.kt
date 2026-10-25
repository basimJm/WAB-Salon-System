package com.fab.wab.merchant.feature.team.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.permission.PermissionTemplates
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.feature.team.domain.MemberDraft
import com.fab.wab.merchant.feature.team.domain.TeamMember
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.feature.team.presentation.controller.contract.PermissionsContract.SideEffect
import com.fab.wab.merchant.feature.team.presentation.controller.contract.PermissionsContract.UiAction
import com.fab.wab.merchant.feature.team.presentation.controller.vm.PermissionsViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

private class PermissionsTeam : com.fab.wab.merchant.feature.team.domain.TeamRepository by FakeTeam() {
    val saved = mutableListOf<Set<Permission>?>()
    private val members = mapOf(
        "m1" to teamMember("m1", MemberRole.MANAGER).copy(permissions = setOf(Permission.REVIEWS_VIEW)),
        "owner" to teamMember("owner", MemberRole.OWNER),
    )
    override fun cached(id: String): TeamMember? = members[id]
    override suspend fun update(id: String, draft: MemberDraft, permissions: Set<Permission>?): AppResult<TeamMember> {
        saved += permissions
        return AppResult.Success(members.getValue(id).copy(permissions = permissions.orEmpty()))
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class PermissionsViewModelTest {

    private val team = PermissionsTeam()

    private fun TestScope.viewModel(id: String) = PermissionsViewModel(id, team, NoOpAnalyticsTracker, { "failed" }, backgroundScope)
        .also { vm -> backgroundScope.launch { vm.state.collect { } } }

    @Test
    fun toggleTemplateAndSave() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel("m1")
        val effects = mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }
        assertFalse(viewModel.state.first { !it.loading }.canSave)
        viewModel.onEvent(UiAction.OnToggle(Permission.FINANCE_VIEW))
        assertTrue(viewModel.state.first().canSave)
        viewModel.onEvent(UiAction.OnApplyTemplate)
        assertEquals(PermissionTemplates.MANAGER, viewModel.state.first().selected)
        viewModel.onEvent(UiAction.OnSave)
        assertEquals(PermissionTemplates.MANAGER, team.saved.single())
        assertFalse(viewModel.state.first().canSave)
        assertEquals(SideEffect.Saved, effects.last())
    }

    @Test
    fun theOwnerIsLocked() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel("owner")
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnToggle(Permission.FINANCE_VIEW))
        viewModel.onEvent(UiAction.OnApplyTemplate)
        viewModel.onEvent(UiAction.OnSave)
        assertTrue(team.saved.isEmpty())
    }
}

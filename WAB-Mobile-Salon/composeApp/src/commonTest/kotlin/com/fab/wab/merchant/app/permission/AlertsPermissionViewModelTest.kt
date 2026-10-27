package com.fab.wab.merchant.app.permission

import com.fab.wab.merchant.app.permission.AlertsPermissionContract.UiAction
import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.ui.permission.AppPermission
import com.fab.wab.merchant.core.ui.permission.FakeOverlayPermission
import com.fab.wab.merchant.core.ui.permission.PermissionFlow
import com.fab.wab.merchant.core.ui.permission.PermissionManager
import com.fab.wab.merchant.core.ui.permission.PermissionStatus
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

private class Notifications(var status: PermissionStatus, private val answer: PermissionStatus = PermissionStatus.GRANTED) :
    PermissionManager {
    val requested = mutableListOf<AppPermission>()
    override suspend fun status(permission: AppPermission) = status
    override suspend fun request(permission: AppPermission): PermissionStatus {
        requested += permission
        status = answer
        return answer
    }
    override fun openSettings(permission: AppPermission) = Unit
    override fun isLocationServiceEnabled() = true
    override fun openLocationServiceSettings() = Unit
}

private class PromptStore(prompted: Boolean) : SessionStore {
    val promptedFlag = MutableStateFlow(prompted)
    override val state: Flow<SessionState> = MutableStateFlow(SessionState.Guest)
    override val pushEnabled: Flow<Boolean> = MutableStateFlow(true)
    override val overlayPermissionPrompted: Flow<Boolean> = promptedFlag
    override suspend fun tokens(): AuthTokens? = null
    override suspend fun signIn(tokens: AuthTokens, member: MemberProfile, permissions: Set<String>, salonState: SalonState?) = Unit
    override suspend fun updateTokens(tokens: AuthTokens) = Unit
    override suspend fun updateMember(member: MemberProfile) = Unit
    override suspend fun updatePermissions(permissions: Set<String>) = Unit
    override suspend fun updateSalonState(salonState: SalonState?) = Unit
    override suspend fun setPushEnabled(enabled: Boolean) = Unit
    override suspend fun setOverlayPermissionPrompted(prompted: Boolean) {
        promptedFlag.value = prompted
    }
    override suspend fun signOut() = Unit
    override suspend fun clearAll() = Unit
}

@OptIn(ExperimentalCoroutinesApi::class)
class AlertsPermissionViewModelTest {

    private fun TestScope.viewModel(
        manager: Notifications,
        overlay: FakeOverlayPermission,
        store: PromptStore,
        answersRequests: Boolean = true,
    ) = AlertsPermissionViewModel(PermissionFlow(manager), manager, overlay, store, answersRequests, backgroundScope)
        .also { vm -> backgroundScope.launch { vm.state.collect { } } }

    @Test
    fun notificationsAreExplainedThenAskedThenTheOverlayOnce() = runTest(UnconfinedTestDispatcher()) {
        val manager = Notifications(PermissionStatus.DENIED)
        val overlay = FakeOverlayPermission()
        val store = PromptStore(prompted = false)
        val vm = viewModel(manager, overlay, store)
        assertEquals(AlertsStep.NOTIFICATIONS, vm.state.first().step)
        assertTrue(manager.requested.isEmpty(), "the system dialog only follows the explanation")
        vm.onEvent(UiAction.OnAllow)
        assertEquals(listOf(AppPermission.NOTIFICATIONS), manager.requested)
        assertEquals(AlertsStep.OVERLAY, vm.state.first().step)
        vm.onEvent(UiAction.OnAllow)
        assertEquals(1, overlay.opened)
        assertTrue(store.promptedFlag.value)
        assertNull(vm.state.first().step)
    }

    @Test
    fun laterSkipsTheSystemDialogAndTheOverlayIsNotAskedAgain() = runTest(UnconfinedTestDispatcher()) {
        val manager = Notifications(PermissionStatus.DENIED)
        val overlay = FakeOverlayPermission()
        val vm = viewModel(manager, overlay, PromptStore(prompted = true))
        vm.onEvent(UiAction.OnLater)
        assertTrue(manager.requested.isEmpty())
        assertNull(vm.state.first().step)
        assertEquals(0, overlay.opened)
    }

    @Test
    fun settledNotificationsGoStraightToTheOverlayOnlyForRequestAnswerers() = runTest(UnconfinedTestDispatcher()) {
        val granted = Notifications(PermissionStatus.GRANTED)
        assertEquals(AlertsStep.OVERLAY, viewModel(granted, FakeOverlayPermission(), PromptStore(false)).state.first().step)
        val employee = viewModel(granted, FakeOverlayPermission(), PromptStore(false), answersRequests = false)
        assertNull(employee.state.first().step)
        val ios = viewModel(
            Notifications(PermissionStatus.DENIED_PERMANENTLY),
            FakeOverlayPermission(isSupported = false),
            PromptStore(false),
        )
        assertNull(ios.state.first().step)
        val alreadyOn = viewModel(granted, FakeOverlayPermission(granted = true), PromptStore(false))
        assertNull(alreadyOn.state.first().step)
    }
}

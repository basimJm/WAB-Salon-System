package com.fab.wab.merchant.core.domain.dev

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.auth.TokenRefreshResult
import com.fab.wab.merchant.core.domain.permission.FakeSessionStore
import com.fab.wab.merchant.core.domain.permission.PermissionsSync
import com.fab.wab.merchant.core.domain.salon.SalonProfile
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.domain.session.SessionState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

private class RecordingControls(override val enabled: Boolean) : MockControls {
    val calls = mutableListOf<String>()
    override fun setSalonState(state: SalonState) {
        calls += "salon:$state"
    }
    override fun setMember(preset: MockMemberPreset) {
        calls += "member:$preset"
    }
}

private class CountingSalon : SalonRepository {
    var refreshes = 0
    override val current: StateFlow<SalonProfile?> = MutableStateFlow(null)
    override suspend fun refresh(): AppResult<SalonProfile> {
        refreshes++
        return AppResult.Error(AppError.NetworkError("mock"))
    }
}

/** MER-007 / MER-057: the dev switch changes the mock world and re-reads the salon or the member; inert off mock. */
class SwitchMockWorldUseCaseTest {
    private val store = FakeSessionStore(SessionState.SignedIn(MemberProfile("m1", "s1", "Huda", MemberRole.OWNER), emptySet()))

    @Test
    fun switchingReReadsTheSalonOrTheMemberOnlyInMockMode() = runTest {
        var memberRefreshes = 0
        val sync = PermissionsSync({ memberRefreshes++; TokenRefreshResult.Unavailable }, store)
        val controls = RecordingControls(enabled = true)
        val salon = CountingSalon()
        val useCase = SwitchMockWorldUseCase(controls, salon, sync)
        useCase.salonState(SalonState.LIVE)
        useCase.member(MockMemberPreset.MANAGER)
        assertEquals(listOf("salon:LIVE", "member:MANAGER"), controls.calls)
        assertEquals(1, salon.refreshes)
        assertEquals(1, memberRefreshes)

        val off = RecordingControls(enabled = false)
        SwitchMockWorldUseCase(off, salon, sync).salonState(SalonState.OFFLINE)
        assertTrue(off.calls.isEmpty())
        assertEquals(1, salon.refreshes)
    }
}

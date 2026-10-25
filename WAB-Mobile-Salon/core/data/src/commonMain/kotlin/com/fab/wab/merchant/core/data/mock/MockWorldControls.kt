package com.fab.wab.merchant.core.data.mock

import com.fab.wab.merchant.core.common.AppEnvironment
import com.fab.wab.merchant.core.domain.dev.MockControls
import com.fab.wab.merchant.core.domain.dev.MockMemberPreset
import com.fab.wab.merchant.core.domain.session.SalonState

/** [MockControls] over [MockScenarios]; active only when the build uses the mock data source. */
class MockWorldControls(environment: AppEnvironment) : MockControls {
    override val enabled: Boolean = environment.usesMock

    override fun setSalonState(state: SalonState) {
        MockScenarios.setSalonState(MockSalonState.valueOf(state.name))
    }

    override fun setMember(preset: MockMemberPreset) {
        MockScenarios.setMember(
            when (preset) {
                MockMemberPreset.OWNER -> MockPresets.owner
                MockMemberPreset.MANAGER -> MockPresets.manager
                MockMemberPreset.EMPLOYEE -> MockPresets.employee
                MockMemberPreset.NONE -> MockPresets.noPermissions
            },
        )
    }

    override fun markBookingPending(bookingId: String) {
        if (enabled) MockScenarios.markBookingPending(bookingId)
    }
}

package com.fab.wab.merchant.core.domain.dev

import com.fab.wab.merchant.core.domain.permission.PermissionsSync
import com.fab.wab.merchant.core.domain.salon.BusinessKind
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.domain.session.SalonState

/** Signed-in member presets of the mock world (PRD §6.3 templates; NONE = a member without permissions). */
enum class MockMemberPreset { OWNER, MANAGER, EMPLOYEE, NONE }

/**
 * Dev-only switch of the mock data source (MER-007 scenario switcher): which salon lifecycle state and which member
 * the fixtures answer with. [enabled] is false outside mock mode, so nothing can change remote data.
 */
interface MockControls {
    val enabled: Boolean
    fun setSalonState(state: SalonState)
    fun setMember(preset: MockMemberPreset)

    /** Salon or clinic and its audience (BUSINESS_DOMAIN §5.19); mock builds only. */
    fun setBusinessKind(kind: BusinessKind) = Unit

    /** The booking-request triggers mark their booking PENDING so the request sheet / overlay can show it. */
    fun markBookingPending(bookingId: String)
}

object NoMockControls : MockControls {
    override val enabled: Boolean = false
    override fun setSalonState(state: SalonState) = Unit
    override fun setMember(preset: MockMemberPreset) = Unit
    override fun markBookingPending(bookingId: String) = Unit
}

/** Switches the mock world, then re-reads the salon / the member so the launch route, tabs and tiles follow. */
class SwitchMockWorldUseCase(
    private val controls: MockControls,
    private val salon: SalonRepository,
    private val permissions: PermissionsSync,
) {
    val enabled: Boolean get() = controls.enabled

    suspend fun salonState(state: SalonState) {
        if (!controls.enabled) return
        controls.setSalonState(state)
        salon.refresh()
    }

    suspend fun businessKind(kind: BusinessKind) {
        if (!controls.enabled) return
        controls.setBusinessKind(kind)
        salon.refresh()
    }

    suspend fun member(preset: MockMemberPreset) {
        if (!controls.enabled) return
        controls.setMember(preset)
        permissions.refresh()
    }
}

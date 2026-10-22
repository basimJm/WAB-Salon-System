package com.fab.wab.merchant.core.data.mock

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** What the fixture transport answers: every state a screen must handle, switchable at runtime. */
enum class MockScenario {
    Success,
    Empty,
    Unauthorized,
    NotFound,
    ServerError,
    Timeout,
    Offline,
}

/** Salon lifecycle states of `GET /salon` and `GET /salon/application` (`openapi.merchant.json`). */
enum class MockSalonState {
    APPLICATION_PENDING,
    APPLICATION_REJECTED,
    APPROVED_INCOMPLETE,
    LIVE,
    OFFLINE,
}

/** Who is signed in: the member role and the grantable permission keys (PRD §6.2); the owner always has all. */
data class MockMember(val role: String, val permissions: Set<String>)

/**
 * Current mock world, switchable at runtime from the dev scenario switcher: the transport [scenario], the salon state
 * and the signed-in member. Null overrides keep what the generated fixtures say.
 */
object MockScenarios {
    private val state = MutableStateFlow(MockScenario.Success)
    private val salon = MutableStateFlow<MockSalonState?>(null)
    private val signedIn = MutableStateFlow<MockMember?>(null)

    val current: StateFlow<MockScenario> = state.asStateFlow()
    val salonState: StateFlow<MockSalonState?> = salon.asStateFlow()
    val member: StateFlow<MockMember?> = signedIn.asStateFlow()

    fun set(scenario: MockScenario) {
        state.value = scenario
    }

    fun setSalonState(value: MockSalonState?) {
        salon.value = value
    }

    fun setMember(value: MockMember?) {
        signedIn.value = value
    }

    /** Back to the generated fixtures as they are. */
    fun reset() {
        state.value = MockScenario.Success
        salon.value = null
        signedIn.value = null
    }
}

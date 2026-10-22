package com.fab.wab.customer.feature.onboarding.presentation

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsScreen
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.AnalyticsValue
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.feature.onboarding.domain.usecase.SaveGuestProfileUseCase
import com.fab.wab.customer.feature.onboarding.presentation.analytics.GuestProfileAnalytics
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.GuestProfileContract.SideEffect
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.GuestProfileContract.UiAction
import com.fab.wab.customer.feature.onboarding.presentation.controller.vm.GuestProfileViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

private class RecordingSessionStore : SessionStore {
    var saved: GuestProfile? = null
    override val state: Flow<SessionState> = MutableStateFlow(SessionState.Guest())
    override val onboardingSeen: Flow<Boolean> = MutableStateFlow(true)
    override val pushEnabled: Flow<Boolean> = MutableStateFlow(true)
    override suspend fun tokens(): AuthTokens? = null
    override suspend fun signIn(tokens: AuthTokens, user: UserProfile) = Unit
    override suspend fun updateTokens(tokens: AuthTokens) = Unit
    override suspend fun updateUser(user: UserProfile) = Unit
    override suspend fun setOnboardingSeen(seen: Boolean) = Unit
    override suspend fun setGuestProfile(profile: GuestProfile) {
        saved = profile
    }
    override suspend fun setPushEnabled(enabled: Boolean) = Unit
    override suspend fun signOut() = Unit
    override suspend fun clearAll() = Unit
}

private class ActionsTracker : AnalyticsTracker {
    val actions = mutableListOf<AnalyticsAction>()
    override fun trackScreen(screen: AnalyticsScreen) = Unit
    override fun trackAction(action: AnalyticsAction) {
        actions += action
    }
    override fun trackRoute(route: String?) = Unit
    override fun setUserId(userId: String?) = Unit
    override fun setUserProperty(key: String, value: String?) = Unit
}

@OptIn(ExperimentalCoroutinesApi::class)
class GuestProfileViewModelTest {

    private val store = RecordingSessionStore()
    private val tracker = ActionsTracker()

    @Test
    fun continueIsDisabledUntilBothValuesAreValid() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = GuestProfileViewModel(SaveGuestProfileUseCase(store), tracker, backgroundScope)
        assertFalse(viewModel.state.first().canContinue)
        viewModel.onEvent(UiAction.OnGenderSelect(Gender.FEMALE))
        assertFalse(viewModel.state.first().canContinue)
        viewModel.onEvent(UiAction.OnNicknameChange("  "))
        assertFalse(viewModel.state.first().canContinue)
        viewModel.onEvent(UiAction.OnNicknameChange("Lina"))
        assertTrue(viewModel.state.first().canContinue)
    }

    @Test
    fun blankNicknameShowsTheErrorAndClearsOnTyping() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = GuestProfileViewModel(SaveGuestProfileUseCase(store), tracker, backgroundScope)
        viewModel.state.first()
        viewModel.onEvent(UiAction.OnContinueClick)
        assertTrue(viewModel.state.first().nicknameError)
        assertNull(store.saved)
        viewModel.onEvent(UiAction.OnNicknameChange("L"))
        assertFalse(viewModel.state.first().nicknameError)
    }

    @Test
    fun savingStoresTrimmedValuesLocallyAndTracksOnlyTheGender() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = GuestProfileViewModel(SaveGuestProfileUseCase(store), tracker, backgroundScope)
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { viewModel.sideEffect.collect { effects += it } }
        viewModel.state.first()
        viewModel.onEvent(UiAction.OnNicknameChange(" Lina "))
        viewModel.onEvent(UiAction.OnGenderSelect(Gender.FEMALE))
        viewModel.onEvent(UiAction.OnContinueClick)
        assertEquals(GuestProfile("Lina", Gender.FEMALE), store.saved)
        assertEquals(listOf<SideEffect>(SideEffect.Saved), effects)
        val action = tracker.actions.single()
        assertEquals(GuestProfileAnalytics.ACTION_SAVED, action.name)
        assertEquals(AnalyticsValue.Text("female"), action.params[GuestProfileAnalytics.PARAM_GENDER])
        assertFalse(action.params.values.any { it == AnalyticsValue.Text("Lina") })
    }
}

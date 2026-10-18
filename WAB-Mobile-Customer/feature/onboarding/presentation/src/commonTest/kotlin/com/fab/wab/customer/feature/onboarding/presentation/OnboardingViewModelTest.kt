package com.fab.wab.customer.feature.onboarding.presentation

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsScreen
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.feature.onboarding.domain.model.OnboardingPage
import com.fab.wab.customer.feature.onboarding.domain.usecase.MarkOnboardingSeenUseCase
import com.fab.wab.customer.feature.onboarding.presentation.analytics.OnboardingAnalytics
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.OnboardingContract.SideEffect
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.OnboardingContract.UiAction
import com.fab.wab.customer.feature.onboarding.presentation.controller.vm.OnboardingViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

private class FakeSessionStore : SessionStore {
    val seen = MutableStateFlow(false)
    override val state: Flow<SessionState> = MutableStateFlow(SessionState.Guest())
    override val onboardingSeen: Flow<Boolean> = seen
    override val pushEnabled: Flow<Boolean> = MutableStateFlow(true)
    override suspend fun tokens(): AuthTokens? = null
    override suspend fun signIn(tokens: AuthTokens, user: UserProfile) = Unit
    override suspend fun updateTokens(tokens: AuthTokens) = Unit
    override suspend fun updateUser(user: UserProfile) = Unit
    override suspend fun setOnboardingSeen(seen: Boolean) {
        this.seen.value = seen
    }
    override suspend fun setGuestProfile(profile: GuestProfile) = Unit
    override suspend fun setPushEnabled(enabled: Boolean) = Unit
    override suspend fun signOut() = Unit
    override suspend fun clearAll() = Unit
}

private class RecordingTracker : AnalyticsTracker {
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
class OnboardingViewModelTest {

    private val store = FakeSessionStore()
    private val tracker = RecordingTracker()

    @Test
    fun displayMarksOnboardingSeenImmediately() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = OnboardingViewModel(MarkOnboardingSeenUseCase(store), tracker, backgroundScope)
        assertEquals(OnboardingPage.DISCOVER, viewModel.state.first().page)
        assertTrue(store.seen.value)
    }

    @Test
    fun nextScrollsUntilTheLastPageCompletes() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = OnboardingViewModel(MarkOnboardingSeenUseCase(store), tracker, backgroundScope)
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { viewModel.sideEffect.collect { effects += it } }
        viewModel.state.first()
        viewModel.onEvent(UiAction.OnNextClicked)
        assertEquals(listOf<SideEffect>(SideEffect.ScrollToPage(1)), effects)
        viewModel.onEvent(UiAction.OnPageShown(OnboardingPage.entries.lastIndex))
        assertTrue(viewModel.state.first().isLastPage)
        viewModel.onEvent(UiAction.OnNextClicked)
        assertEquals(SideEffect.Finished, effects.last())
        assertEquals(listOf(OnboardingAnalytics.ACTION_NEXT, OnboardingAnalytics.ACTION_COMPLETE), tracker.actions.map { it.name })
    }

    @Test
    fun skipFinishesFromAnyPage() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = OnboardingViewModel(MarkOnboardingSeenUseCase(store), tracker, backgroundScope)
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { viewModel.sideEffect.collect { effects += it } }
        viewModel.state.first()
        viewModel.onEvent(UiAction.OnPageShown(1))
        viewModel.onEvent(UiAction.OnSkipClicked)
        assertEquals(listOf<SideEffect>(SideEffect.Finished), effects)
        assertEquals(OnboardingAnalytics.ACTION_SKIP, tracker.actions.single().name)
    }
}

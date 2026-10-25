package com.fab.wab.merchant.feature.salon.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.config.AppConfig
import com.fab.wab.merchant.core.domain.config.AppConfigRepository
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.feature.salon.domain.Subscription
import com.fab.wab.merchant.feature.salon.domain.SubscriptionRepository
import com.fab.wab.merchant.feature.salon.domain.SubscriptionStatus
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ContactReason
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SubscriptionContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SubscriptionContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.SubscriptionViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

private class FakeSubscription(var result: AppResult<Subscription>) : SubscriptionRepository {
    override suspend fun subscription(): AppResult<Subscription> = result
}

private class FakeConfig : AppConfigRepository {
    private val state = MutableStateFlow<AppConfig?>(null)
    override val current: StateFlow<AppConfig?> = state
    override suspend fun refresh(): AppResult<AppConfig> = AppResult.Error(AppError.NetworkError("x"))
}

@OptIn(ExperimentalCoroutinesApi::class)
class SubscriptionViewModelTest {

    private fun TestScope.viewModel(result: AppResult<Subscription>) =
        SubscriptionViewModel(FakeSubscription(result), FakeConfig(), NoOpAnalyticsTracker, { "failed" }, backgroundScope)
            .also { vm -> backgroundScope.launch { vm.state.collect { } } }

    @Test
    fun loadsTheSubscriptionAndOpensTheContactSheet() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel(AppResult.Success(Subscription(SubscriptionStatus.TRIAL, SalonState.LIVE, "2026-10-29", 5, true)))
        val effects = mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }
        assertEquals(5, viewModel.state.first { !it.loading }.subscription?.daysRemaining)
        viewModel.onEvent(UiAction.OnContact(ContactReason.FEATURED))
        assertEquals(ContactReason.FEATURED, viewModel.state.first().contactSheet)
        viewModel.onEvent(UiAction.OnCall)
        assertEquals(emptyList(), effects)
        viewModel.onEvent(UiAction.OnDismissContact)
        assertNull(viewModel.state.first().contactSheet)
    }

    @Test
    fun errorShowsRetry() = runTest(UnconfinedTestDispatcher()) {
        assertEquals("failed", viewModel(AppResult.Error(AppError.NetworkError("x"))).state.first { !it.loading }.error)
    }
}

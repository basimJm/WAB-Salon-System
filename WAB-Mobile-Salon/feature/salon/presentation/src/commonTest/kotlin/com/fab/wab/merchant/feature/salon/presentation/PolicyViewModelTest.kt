package com.fab.wab.merchant.feature.salon.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.policy.FullPaymentRefund
import com.fab.wab.merchant.core.domain.policy.NoShowDeposit
import com.fab.wab.merchant.core.domain.policy.NoShowFullPayment
import com.fab.wab.merchant.core.domain.policy.PaymentOption
import com.fab.wab.merchant.feature.salon.domain.PolicyDraft
import com.fab.wab.merchant.feature.salon.domain.PolicyField
import com.fab.wab.merchant.feature.salon.domain.PolicyRepository
import com.fab.wab.merchant.feature.salon.domain.SalonPolicy
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.PolicyContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.PolicyContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.PolicyViewModel
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

private class FakePolicy(var current: SalonPolicy? = null) : PolicyRepository {
    val saved = mutableListOf<PolicyDraft>()
    var fail = false
    override suspend fun policy(): AppResult<SalonPolicy?> = AppResult.Success(current)
    override suspend fun save(draft: PolicyDraft): AppResult<SalonPolicy> {
        if (fail) return AppResult.Error(AppError.NetworkError("x"))
        saved += draft
        return AppResult.Success(
            SalonPolicy(
                draft.windowHours.toInt(),
                draft.options,
                draft.depositPercentage.toIntOrNull(),
                draft.depositRefundable,
                draft.fullRefund,
                draft.noShowDeposit,
                draft.noShowFull,
                draft.notes,
            ),
        )
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class PolicyViewModelTest {

    private fun TestScope.viewModel(repository: PolicyRepository) = PolicyViewModel(
        repository,
        NoOpAnalyticsTracker,
        { "failed" },
        backgroundScope,
    )
        .also { vm -> backgroundScope.launch { vm.state.collect { } } }

    @Test
    fun newPolicyStartsFromDefaultsAndNeedsADepositPercentage() = runTest(UnconfinedTestDispatcher()) {
        val repository = FakePolicy()
        val viewModel = viewModel(repository)
        val effects = mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }
        val state = viewModel.state.first { !it.loading }
        assertTrue(state.isNew && state.canSave)
        assertEquals(24, state.presetWindow)
        viewModel.onEvent(UiAction.OnOption(PaymentOption.DEPOSIT))
        viewModel.onEvent(UiAction.OnSave)
        assertEquals(setOf(PolicyField.DEPOSIT), viewModel.state.first().visibleErrors)
        viewModel.onEvent(UiAction.OnDeposit("2O5"))
        assertEquals("25", viewModel.state.first().draft.depositPercentage)
        viewModel.onEvent(UiAction.OnDepositRefundable(false))
        viewModel.onEvent(UiAction.OnNoShowDeposit(NoShowDeposit.REFUND))
        viewModel.onEvent(UiAction.OnSave)
        val draft = repository.saved.single()
        assertEquals(setOf(PaymentOption.PAY_ON_ARRIVAL, PaymentOption.DEPOSIT), draft.options)
        assertFalse(draft.depositRefundable)
        assertEquals(SideEffect.Saved, effects.last())
        assertFalse(viewModel.state.first().canSave)
    }

    @Test
    fun customWindowAndOutcomesFromAnExistingPolicy() = runTest(UnconfinedTestDispatcher()) {
        val existing = SalonPolicy(
            36,
            setOf(PaymentOption.FULL_ONLINE),
            null,
            true,
            FullPaymentRefund.FULL,
            NoShowDeposit.KEEP,
            NoShowFullPayment.KEEP,
            "Arrive early",
        )
        val viewModel = viewModel(FakePolicy(existing))
        val state = viewModel.state.first { !it.loading }
        assertTrue(state.customWindow)
        assertFalse(state.canSave)
        viewModel.onEvent(UiAction.OnWindowPreset(12))
        assertEquals(12, viewModel.state.first().presetWindow)
        viewModel.onEvent(UiAction.OnWindowCustom)
        viewModel.onEvent(UiAction.OnWindowText("9999"))
        assertEquals("999", viewModel.state.first().draft.windowHours)
        viewModel.onEvent(UiAction.OnSave)
        assertEquals(setOf(PolicyField.WINDOW), viewModel.state.first().visibleErrors)
        viewModel.onEvent(UiAction.OnFullRefund(FullPaymentRefund.MINUS_DEPOSIT))
        viewModel.onEvent(UiAction.OnNoShowFull(NoShowFullPayment.REFUND_FULL))
        viewModel.onEvent(UiAction.OnPreview)
        assertTrue(viewModel.state.first().previewOpen)
    }
}

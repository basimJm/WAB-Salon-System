package com.fab.wab.merchant.feature.finance.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.booking.RefundStatus
import com.fab.wab.merchant.core.domain.branch.Branch
import com.fab.wab.merchant.core.domain.branch.BranchName
import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.core.domain.branch.BranchStatus
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.MemberScope
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.feature.finance.domain.FinanceBalance
import com.fab.wab.merchant.feature.finance.domain.FinanceDefaults
import com.fab.wab.merchant.feature.finance.domain.FinanceRange
import com.fab.wab.merchant.feature.finance.domain.FinanceRepository
import com.fab.wab.merchant.feature.finance.domain.FinanceTab
import com.fab.wab.merchant.feature.finance.domain.PaymentType
import com.fab.wab.merchant.feature.finance.domain.Payout
import com.fab.wab.merchant.feature.finance.domain.Refund
import com.fab.wab.merchant.feature.finance.domain.RefundSource
import com.fab.wab.merchant.feature.finance.domain.Transaction
import com.fab.wab.merchant.feature.finance.presentation.controller.contract.FinanceContract.SideEffect
import com.fab.wab.merchant.feature.finance.presentation.controller.contract.FinanceContract.UiAction
import com.fab.wab.merchant.feature.finance.presentation.controller.vm.FinanceDependencies
import com.fab.wab.merchant.feature.finance.presentation.controller.vm.FinanceViewModel
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.LocalDate

private val TODAY = LocalDate(2026, 10, 24)

private class FakeFinance : FinanceRepository {
    val calls = mutableListOf<String>()
    val branchIds = mutableListOf<String?>()
    var fail = false
    override suspend fun balance(): AppResult<FinanceBalance> =
        AppResult.Success(FinanceBalance("10.000", "5.000", "20.000", "1.000", "2.000", "8.000", "8.000", "2026-10-01", null))
    override suspend fun transactions(from: LocalDate, to: LocalDate, page: Int, branchId: String?): AppResult<List<Transaction>> {
        branchIds += branchId
        calls += "tx:$from:$to:$page"
        if (fail) return AppResult.Error(AppError.NetworkError("x"))
        val size = if (page == 1) FinanceDefaults.PAGE_SIZE else 1
        return AppResult.Success(
            List(size) { Transaction("t$page-$it", "b$it", "WAB-$it", PaymentType.DEPOSIT, "5.000", "0.100", "4.900", "2026-10-02") },
        )
    }
    override suspend fun refunds(from: LocalDate, to: LocalDate, page: Int, branchId: String?): AppResult<List<Refund>> {
        branchIds += branchId
        calls += "rf:$from:$to:$page"
        return AppResult.Success(
            listOf(Refund("r1", null, null, "5.000", RefundSource.AUTO_CANCEL, null, RefundStatus.REFUNDED, "2026-10-02", null)),
        )
    }
    override suspend fun payouts(from: LocalDate, to: LocalDate, page: Int): AppResult<List<Payout>> {
        calls += "po:$from:$to:$page"
        return AppResult.Success(emptyList())
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class FinanceViewModelTest {

    private val finance = FakeFinance()

    private fun TestScope.viewModel(role: MemberRole = MemberRole.OWNER) = FinanceViewModel(
        FinanceDependencies(
            finance,
            flowOf(SessionState.SignedIn(MemberProfile("m", "s", "Huda", role), setOf("FINANCE_VIEW"))),
            NoOpAnalyticsTracker,
            { TODAY },
            { "failed" },
        ),
        testScope = backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    @Test
    fun thisMonthTransactionsThenPagingTabsAndRanges() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val state = viewModel.state.first { !it.loading && it.balance != null }
        assertEquals("tx:2026-10-01:2026-10-24:1", finance.calls.first())
        assertTrue(state.hasMore && state.canManageBank)
        viewModel.onEvent(UiAction.OnLoadMore)
        assertEquals(FinanceDefaults.PAGE_SIZE + 1, viewModel.state.first().transactions.size)
        assertFalse(viewModel.state.first().hasMore)
        viewModel.onEvent(UiAction.OnTab(FinanceTab.REFUNDS))
        assertEquals("rf:2026-10-01:2026-10-24:1", finance.calls.last())
        viewModel.onEvent(UiAction.OnRange(FinanceRange.THIS_YEAR))
        assertEquals("rf:2026-01-01:2026-10-24:1", finance.calls.last())
        val before = finance.calls.size
        viewModel.onEvent(UiAction.OnRange(FinanceRange.CUSTOM))
        assertEquals(before, finance.calls.size)
        viewModel.onEvent(UiAction.OnFrom(LocalDate(2026, 11, 1)))
        assertEquals(LocalDate(2026, 11, 1), viewModel.state.first().to)
        viewModel.onEvent(UiAction.OnTab(FinanceTab.PAYOUTS))
        assertTrue(viewModel.state.first().isEmpty)
    }

    @Test
    fun managersCannotOpenBankDetailsAndErrorsShowRetry() = runTest(UnconfinedTestDispatcher()) {
        finance.fail = true
        val viewModel = viewModel(MemberRole.MANAGER)
        val effects = mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }
        val state = viewModel.state.first { !it.loading }
        assertEquals("failed", state.error)
        assertFalse(state.canManageBank)
        viewModel.onEvent(UiAction.OnBank)
        viewModel.onEvent(UiAction.OnBooking("b1"))
        assertEquals(listOf<SideEffect>(SideEffect.OpenBooking("b1")), effects)
    }

    @Test
    fun ownerNarrowsTransactionsAndRefundsToABranch() = runTest(UnconfinedTestDispatcher()) {
        val branches = listOf("b1", "b2").map {
            Branch(it, BranchName(it, it), it == "b1", BranchStatus.ACTIVE, null, null, null, null, null, null, null, emptyList())
        }
        val scope = MutableStateFlow(BranchScope(MemberScope.AllBranches, branches, null))
        val viewModel = FinanceViewModel(
            FinanceDependencies(
                finance, flowOf(SessionState.SignedIn(MemberProfile("m", "s", "Huda", MemberRole.OWNER))), NoOpAnalyticsTracker,
                { TODAY }, { "failed" }, scope, {},
            ),
            testScope = backgroundScope,
        ).also { vm -> backgroundScope.launch { vm.state.collect { } } }
        val all = viewModel.state.first { !it.loading }
        assertTrue(all.showsBranchSwitcher)
        assertEquals(null, finance.branchIds.last())
        scope.value = scope.value.copy(selected = "b2")
        viewModel.state.first { it.branchScope.filter == "b2" && !it.loading }
        assertEquals("b2", finance.branchIds.last())
        viewModel.onEvent(UiAction.OnTab(FinanceTab.PAYOUTS))
        assertFalse(viewModel.state.first().showsBranchSwitcher, "payouts are salon-wide")
    }
}

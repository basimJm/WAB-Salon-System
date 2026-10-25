package com.fab.wab.merchant.feature.insights.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.branch.Branch
import com.fab.wab.merchant.core.domain.branch.BranchName
import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.core.domain.branch.BranchStatus
import com.fab.wab.merchant.core.domain.session.MemberScope
import com.fab.wab.merchant.feature.insights.domain.BookingStats
import com.fab.wab.merchant.feature.insights.domain.Revenue
import com.fab.wab.merchant.feature.insights.domain.Statistics
import com.fab.wab.merchant.feature.insights.domain.StatisticsRepository
import com.fab.wab.merchant.feature.insights.domain.StatsPeriod
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.StatisticsContract.SideEffect
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.StatisticsContract.UiAction
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.StatsChart
import com.fab.wab.merchant.feature.insights.presentation.controller.vm.StatisticsDependencies
import com.fab.wab.merchant.feature.insights.presentation.controller.vm.StatisticsViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

private val TODAY = LocalDate(2026, 10, 28)

private fun stats(total: Int) = Statistics(
    BookingStats(total, emptyMap(), null, null, null, null, 0, Revenue("0", "0", "0")),
    profileViews = 0,
    newReviews = 0,
    averageRating = 0.0,
    days = emptyList(),
    topServices = emptyList(),
    topStaff = emptyList(),
)

private class FakeStatistics : StatisticsRepository {
    val calls = mutableListOf<String>()
    var fail = false
    var total = 3
    override suspend fun statistics(from: LocalDate, to: LocalDate, branchId: String?): AppResult<Statistics> {
        calls += "$from:$to:$branchId"
        return if (fail) AppResult.Error(AppError.NetworkError("x")) else AppResult.Success(stats(total))
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class StatisticsViewModelTest {

    private val repo = FakeStatistics()

    private fun TestScope.viewModel(scope: MutableStateFlow<BranchScope> = MutableStateFlow(BranchScope())) = StatisticsViewModel(
        StatisticsDependencies(repo, NoOpAnalyticsTracker, { TODAY }, { "failed" }, scope, { id -> scope.value = scope.value.copy(selected = id) }),
        testScope = backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    @Test
    fun weekByDefaultThenPresetsAndCustomRangeCappedAt92Days() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.state.first { !it.loading }
        assertEquals("2026-10-24:2026-10-28:null", repo.calls.first())
        viewModel.onEvent(UiAction.OnPeriod(StatsPeriod.MONTH))
        assertEquals("2026-10-01:2026-10-28:null", repo.calls.last())
        val before = repo.calls.size
        viewModel.onEvent(UiAction.OnPeriod(StatsPeriod.CUSTOM))
        assertEquals(before, repo.calls.size, "custom waits for a date")
        viewModel.onEvent(UiAction.OnFrom(LocalDate(2026, 1, 1)))
        assertEquals("2026-01-01:2026-04-02:null", repo.calls.last())
        viewModel.onEvent(UiAction.OnTo(LocalDate(2026, 12, 31)))
        assertEquals("2026-01-01:2026-04-02:null", repo.calls.last(), "never past 92 days")
        viewModel.onEvent(UiAction.OnFrom(LocalDate(2026, 11, 20)))
        assertEquals("2026-10-28:2026-10-28:null", repo.calls.last(), "never in the future")
        viewModel.onEvent(UiAction.OnChart(StatsChart.REVENUE))
        assertEquals(StatsChart.REVENUE, viewModel.state.first().chart)
    }

    @Test
    fun emptyPeriodErrorsAndOwnerBranch() = runTest(UnconfinedTestDispatcher()) {
        val branches = listOf("b1", "b2").map {
            Branch(it, BranchName(it, it), it == "b1", BranchStatus.ACTIVE, null, null, null, null, null, null, null, emptyList())
        }
        val scope = MutableStateFlow(BranchScope(MemberScope.AllBranches, branches, null))
        repo.total = 0
        val viewModel = viewModel(scope)
        val effects = mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }
        assertTrue(viewModel.state.first { !it.loading }.isEmpty)
        viewModel.onEvent(UiAction.OnBranchSelect("b2"))
        assertEquals("2026-10-24:2026-10-28:b2", repo.calls.last())
        repo.fail = true
        viewModel.onEvent(UiAction.OnRefresh)
        val kept = viewModel.state.first { !it.refreshing }
        assertNull(kept.error, "a failed refresh keeps the figures")
        assertEquals(listOf<SideEffect>(SideEffect.ShowError("failed")), effects)
        viewModel.onEvent(UiAction.OnRetry)
        assertEquals("failed", viewModel.state.first { !it.loading }.error)
    }
}

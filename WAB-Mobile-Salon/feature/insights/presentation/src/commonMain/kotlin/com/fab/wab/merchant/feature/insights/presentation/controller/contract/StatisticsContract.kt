package com.fab.wab.merchant.feature.insights.presentation.controller.contract

import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.feature.insights.domain.Statistics
import com.fab.wab.merchant.feature.insights.domain.StatsPeriod
import kotlinx.datetime.LocalDate

/** Which per-day series the chart draws (design 07 `chart`). */
enum class StatsChart { BOOKINGS, REVENUE }

sealed interface StatisticsContract {
    data class UiState(
        val period: StatsPeriod = StatsPeriod.WEEK,
        val from: LocalDate,
        val to: LocalDate,
        val statistics: Statistics? = null,
        val chart: StatsChart = StatsChart.BOOKINGS,
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val error: String? = null,
        val branchScope: BranchScope = BranchScope(),
    ) {
        val isEmpty: Boolean get() = !loading && error == null && statistics?.isEmpty == true
    }

    sealed interface UiAction {
        data class OnPeriod(val period: StatsPeriod) : UiAction
        data class OnFrom(val date: LocalDate) : UiAction
        data class OnTo(val date: LocalDate) : UiAction
        data class OnChart(val chart: StatsChart) : UiAction
        data class OnBranchSelect(val branchId: String?) : UiAction
        data object OnRefresh : UiAction
        data object OnRetry : UiAction
    }

    sealed interface SideEffect {
        data class ShowError(val message: String) : SideEffect
    }
}

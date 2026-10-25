package com.fab.wab.merchant.feature.insights.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsParamsBuilder
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.insights.domain.StatisticsRepository
import com.fab.wab.merchant.feature.insights.domain.StatsPeriod
import com.fab.wab.merchant.feature.insights.domain.clampRange
import com.fab.wab.merchant.feature.insights.domain.dates
import com.fab.wab.merchant.feature.insights.presentation.analytics.InsightsAnalytics
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.StatisticsContract.SideEffect
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.StatisticsContract.UiAction
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.StatisticsContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.datetime.LocalDate
import kotlinx.datetime.daysUntil

class StatisticsDependencies(
    val statistics: StatisticsRepository,
    val analytics: AnalyticsTracker,
    /** Today in Asia/Amman (the server counts civil days there). */
    val today: () -> LocalDate,
    val errorText: suspend (AppError) -> String = ::appErrorText,
    val branchScope: Flow<BranchScope> = flowOf(BranchScope()),
    val selectBranch: (String?) -> Unit = {},
)

private fun initialState(today: LocalDate): UiState {
    val (from, to) = StatsPeriod.WEEK.dates(today) ?: (today to today)
    return UiState(from = from, to = to)
}

/** PRD M21: period selector (today / week / month / custom ≤ 92 days), KPIs, per-day charts, top services / staff. */
class StatisticsViewModel(
    private val deps: StatisticsDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = initialState(deps.today()), testScope) {

    private var loadJob: Job? = null

    override fun onStart() {
        deps.branchScope.onEach { branches ->
            val changed = branches.filter != uiState.value.branchScope.filter
            updateState { copy(branchScope = branches) }
            if (changed) load(refreshing = false)
        }.launchIn(scope)
        load(refreshing = false)
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnPeriod -> {
                val dates = event.period.dates(deps.today())
                updateState {
                    if (dates != null) copy(period = event.period, from = dates.first, to = dates.second) else copy(period = event.period)
                }
                if (dates != null) load(refreshing = false)
            }
            is UiAction.OnFrom -> setRange(event.date, uiState.value.to)
            is UiAction.OnTo -> setRange(uiState.value.from, event.date)
            is UiAction.OnChart -> if (event.chart != uiState.value.chart) {
                updateState { copy(chart = event.chart) }
                track(InsightsAnalytics.ACTION_STATISTICS_CHART) { text(InsightsAnalytics.PARAM_CHART, event.chart.name) }
            }
            is UiAction.OnBranchSelect -> deps.selectBranch(event.branchId)
            UiAction.OnRefresh -> load(refreshing = true)
            UiAction.OnRetry -> load(refreshing = false)
        }
    }

    /** Custom range: `from` ≤ `to`, at most 92 days, never after today. */
    private fun setRange(from: LocalDate, to: LocalDate) {
        val today = deps.today()
        val start = minOf(from, today)
        val (first, last) = clampRange(start, minOf(to, today))
        updateState { copy(period = StatsPeriod.CUSTOM, from = first, to = last) }
        load(refreshing = false)
    }

    private fun track(name: String, params: AnalyticsParamsBuilder.() -> Unit) =
        deps.analytics.trackAction(AnalyticsAction(name, analyticsParams(params)))

    private fun load(refreshing: Boolean) {
        loadJob?.cancel()
        loadJob = scope.launch {
            val state = uiState.value
            updateState { if (refreshing) copy(refreshing = true) else copy(loading = true, error = null) }
            track(InsightsAnalytics.ACTION_STATISTICS_VIEW) {
                text(InsightsAnalytics.PARAM_PERIOD, state.period.name)
                number(InsightsAnalytics.PARAM_DAYS, (state.from.daysUntil(state.to) + 1).toLong())
            }
            when (val result = deps.statistics.statistics(state.from, state.to, state.branchScope.filter)) {
                is AppResult.Success -> updateState { copy(statistics = result.data, loading = false, refreshing = false) }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    val keep = uiState.value.statistics != null && refreshing
                    updateState { copy(loading = false, refreshing = false, error = if (keep) null else message) }
                    if (keep) emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }
}

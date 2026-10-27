package com.fab.wab.merchant.feature.insights.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.common.TimeFormat
import com.fab.wab.merchant.designsystem.components.branch.AppBranchSwitcher
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.chip.AppFilterChip
import com.fab.wab.merchant.designsystem.components.feedback.AppEmptyState
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.shimmer.AppShimmerList
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppDatePickerDialog
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.insights.domain.StatisticsLimits
import com.fab.wab.merchant.feature.insights.domain.StatsPeriod
import com.fab.wab.merchant.feature.insights.presentation.analytics.InsightsAnalytics
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.StatisticsContract.UiAction
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.StatisticsContract.UiState
import com.fab.wab.merchant.feature.insights.presentation.resources.Res
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_empty_body
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_empty_title
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_from
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_period_custom
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_period_month
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_period_today
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_period_week
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_range_note
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_title
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_to
import kotlinx.datetime.LocalDate
import org.jetbrains.compose.resources.stringResource

private const val KEY_FILTERS = "filters"
private const val KEY_LOADING = "loading"
private const val KEY_ERROR = "error"
private const val KEY_EMPTY = "empty"
private const val KEY_KPIS = "kpis"
private const val KEY_REVENUE = "revenue"
private const val KEY_STATUS = "status"
private const val KEY_CHART = "chart"
private const val KEY_RANKINGS = "rankings"

/** PRD M21 (design 07 `on.stats`): period selector, KPIs, revenue, bookings by status, per-day chart, rankings. */
@Composable
fun StatisticsScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(InsightsAnalytics.SCREEN_STATISTICS)
    val spacing = AppTheme.spacing
    AppScreen(modifier = modifier, topBar = { AppTopBar(title = stringResource(Res.string.stats_title), onBack = onBack) }) { padding ->
        AppPullToRefresh(
            refreshing = state.refreshing,
            onRefresh = { onAction(UiAction.OnRefresh) },
            modifier = Modifier.padding(padding),
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(spacing.space16),
                verticalArrangement = Arrangement.spacedBy(spacing.space12),
            ) {
                item(key = KEY_FILTERS, contentType = KEY_FILTERS) { PeriodFilters(state, onAction) }
                val stats = state.statistics
                when {
                    state.loading -> item(key = KEY_LOADING, contentType = KEY_LOADING) { AppShimmerList() }
                    state.error != null -> item(key = KEY_ERROR, contentType = KEY_ERROR) {
                        AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
                    }
                    state.isEmpty || stats == null -> item(key = KEY_EMPTY, contentType = KEY_EMPTY) {
                        AppEmptyState(
                            title = stringResource(Res.string.stats_empty_title),
                            message = stringResource(Res.string.stats_empty_body),
                        )
                    }
                    else -> {
                        item(key = KEY_KPIS, contentType = KEY_KPIS) { KpiGrid(stats) }
                        item(key = KEY_REVENUE, contentType = KEY_REVENUE) { RevenueCard(stats.bookings.revenue) }
                        item(key = KEY_STATUS, contentType = KEY_STATUS) { StatusCard(stats.bookings.byStatus) }
                        item(key = KEY_CHART, contentType = KEY_CHART) { DailyChart(stats.days, state.chart, onAction) }
                        item(key = KEY_RANKINGS, contentType = KEY_RANKINGS) { Rankings(stats) }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PeriodFilters(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space10)) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(spacing.space8), verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
            StatsPeriod.entries.forEach { period ->
                AppFilterChip(stringResource(periodLabel(period)), state.period == period, { onAction(UiAction.OnPeriod(period)) })
            }
        }
        if (state.period == StatsPeriod.CUSTOM) CustomRange(state.from, state.to, onAction)
        if (state.branchScope.showsSwitcher) {
            AppBranchSwitcher(
                branches = state.branchScope.branches,
                selectedId = state.branchScope.filter,
                onSelect = { onAction(UiAction.OnBranchSelect(it)) },
            )
        }
    }
}

@Composable
private fun CustomRange(from: LocalDate, to: LocalDate, onAction: (UiAction) -> Unit) {
    var picking by remember { mutableStateOf<Boolean?>(null) }
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space6)) {
        Row(horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
            DateButton(stringResource(Res.string.stats_from), from, { picking = true }, Modifier.weight(1f))
            DateButton(stringResource(Res.string.stats_to), to, { picking = false }, Modifier.weight(1f))
        }
        AppText(
            text = stringResource(Res.string.stats_range_note, StatisticsLimits.MAX_DAYS),
            style = AppTheme.typography.labelSmall,
            color = AppTheme.colors.muted,
        )
    }
    picking?.let { isFrom ->
        AppDatePickerDialog(
            initialIsoDate = (if (isFrom) from else to).toString(),
            onConfirm = { iso ->
                picking = null
                runCatching { LocalDate.parse(iso) }.getOrNull()?.let { onAction(if (isFrom) UiAction.OnFrom(it) else UiAction.OnTo(it)) }
            },
            onDismiss = { picking = null },
        )
    }
}

@Composable
private fun DateButton(label: String, date: LocalDate, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4)) {
        AppText(text = label, style = AppTheme.typography.labelMedium, color = AppTheme.colors.muted)
        AppButton(
            TimeFormat.isoDateText(date.toString()).orEmpty(),
            onClick,
            Modifier.fillMaxWidth(),
            kind = ButtonKind.Outlined,
            leadingIcon = AppIcons.Calendar,
        )
    }
}

private fun periodLabel(period: StatsPeriod) = when (period) {
    StatsPeriod.TODAY -> Res.string.stats_period_today
    StatsPeriod.WEEK -> Res.string.stats_period_week
    StatsPeriod.MONTH -> Res.string.stats_period_month
    StatsPeriod.CUSTOM -> Res.string.stats_period_custom
}

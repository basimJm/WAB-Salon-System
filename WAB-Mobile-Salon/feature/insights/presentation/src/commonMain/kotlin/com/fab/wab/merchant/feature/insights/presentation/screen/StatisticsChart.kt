package com.fab.wab.merchant.feature.insights.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.format.jodText
import com.fab.wab.merchant.designsystem.components.selector.AppSegmentedTabs
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.insights.domain.DayStat
import com.fab.wab.merchant.feature.insights.domain.barShares
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.StatisticsContract.UiAction
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.StatsChart
import com.fab.wab.merchant.feature.insights.presentation.resources.Res
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_chart_bookings
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_chart_revenue
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_day_value
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_tab_bookings
import com.fab.wab.merchant.feature.insights.presentation.resources.stats_tab_revenue
import org.jetbrains.compose.resources.stringResource

/** Bookings or revenue per day (PRD M21 charts): one bar per day of the period, scaled to the busiest day. */
@Composable
internal fun DailyChart(days: List<DayStat>, chart: StatsChart, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val values = days.map { if (chart == StatsChart.BOOKINGS) it.bookings.toDouble() else it.revenue.toDoubleOrNull() ?: 0.0 }
    val shares = barShares(values)
    val labeled = days.size <= InsightsDesignConstants.LABELED_DAYS_MAX
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space10)) {
            AppSegmentedTabs(
                tabs = listOf(stringResource(Res.string.stats_tab_bookings), stringResource(Res.string.stats_tab_revenue)),
                selectedIndex = chart.ordinal,
                onSelect = { onAction(UiAction.OnChart(StatsChart.entries[it])) },
            )
            AppText(
                text = stringResource(
                    if (chart == StatsChart.BOOKINGS) Res.string.stats_chart_bookings else Res.string.stats_chart_revenue,
                ),
                style = AppTheme.typography.labelLarge,
                color = AppTheme.colors.muted,
            )
            Row(
                modifier = Modifier.fillMaxWidth().height(InsightsDesignConstants.CHART_HEIGHT),
                horizontalArrangement = Arrangement.spacedBy(spacing.space2),
                verticalAlignment = Alignment.Bottom,
            ) {
                days.forEachIndexed { index, day ->
                    val value = if (chart == StatsChart.BOOKINGS) day.bookings.toString() else jodText(day.revenue)
                    Bar(shares[index], stringResource(Res.string.stats_day_value, day.date, value), Modifier.weight(1f))
                }
            }
            if (labeled) DayLabels(days)
        }
    }
}

@Composable
private fun Bar(share: Float, description: String, modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxHeight().semantics { contentDescription = description }, contentAlignment = Alignment.BottomCenter) {
        if (share > 0f) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(share)
                    .heightIn(min = InsightsDesignConstants.CHART_BAR_MIN)
                    .background(AppTheme.colors.accent, AppTheme.shapes.small),
            )
        }
    }
}

@Composable
private fun DayLabels(days: List<DayStat>) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2)) {
        days.forEach { day ->
            Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
                AppText(
                    text = day.date.takeLast(InsightsDesignConstants.DAY_DIGITS),
                    style = AppTheme.typography.labelSmall,
                    color = AppTheme.colors.muted,
                    maxLines = 1,
                )
            }
        }
    }
}

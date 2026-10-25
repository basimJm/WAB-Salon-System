package com.fab.wab.merchant.feature.insights.presentation.screen

import androidx.compose.ui.unit.dp

/** Statistics chart and grid measures (design 07 `stats`). */
internal object InsightsDesignConstants {
    val CHART_HEIGHT = 140.dp
    val CHART_BAR_MIN = 2.dp

    /** Day numbers under the bars only while they stay readable. */
    const val LABELED_DAYS_MAX = 14

    /** KPI tiles per row. */
    const val KPI_COLUMNS = 3

    /** "DD" of an ISO date for the bar labels. */
    const val DAY_DIGITS = 2
}

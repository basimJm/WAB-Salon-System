package com.fab.wab.merchant.feature.home.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.designsystem.components.dashboard.AppSalonStateStrip
import com.fab.wab.merchant.designsystem.components.dashboard.AppWarningBanner
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.layout.tabBarInset
import com.fab.wab.merchant.designsystem.components.shimmer.AppShimmerBox
import com.fab.wab.merchant.designsystem.components.shimmer.AppShimmerSection
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.home.domain.Dashboard
import com.fab.wab.merchant.feature.home.presentation.analytics.HomeAnalytics
import com.fab.wab.merchant.feature.home.presentation.controller.contract.HomeContract.UiAction
import com.fab.wab.merchant.feature.home.presentation.controller.contract.HomeContract.UiState
import com.fab.wab.merchant.feature.home.presentation.resources.Res
import com.fab.wab.merchant.feature.home.presentation.resources.home_incomplete_body
import com.fab.wab.merchant.feature.home.presentation.resources.home_incomplete_title
import com.fab.wab.merchant.feature.home.presentation.resources.home_subscription_body
import com.fab.wab.merchant.feature.home.presentation.resources.home_subscription_title
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

private const val KEY_HEADER = "header"
private const val KEY_STATE = "state"
private const val KEY_SETUP = "setup"
private const val KEY_SUBSCRIPTION = "subscription"
private const val KEY_PENDING = "pending"
private const val KEY_TODAY = "today"
private const val KEY_TIMELINE = "timeline-title"
private const val KEY_EMPTY = "timeline-empty"
private const val KEY_STATS = "stats"
private const val KEY_LOADING = "loading"
private const val KEY_ERROR = "error"
private const val ROW = "timeline-row"
private const val SHIMMER_SECTIONS = 3

/**
 * PRD M07 (design 02 Home `on.home`): header + bell, status strip, subscription warning, pending requests, today at a
 * glance, today's timeline, quick stats; unified shimmer, error + retry, pull-to-refresh.
 */
@Composable
fun HomeScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(HomeAnalytics.SCREEN)
    val spacing = AppTheme.spacing
    AppScreen(modifier = modifier, scrollsUnderTabBar = true) { padding ->
        AppPullToRefresh(
            refreshing = state.refreshing,
            onRefresh = { onAction(UiAction.OnRefresh) },
            modifier = Modifier.padding(padding),
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = spacing.space16,
                    top = spacing.space16,
                    end = spacing.space16,
                    bottom = spacing.space16 + tabBarInset(),
                ),
                verticalArrangement = Arrangement.spacedBy(spacing.space14),
            ) {
                val dashboard = state.dashboard
                item(key = KEY_HEADER, contentType = KEY_HEADER) { HomeHeader(dashboard?.salon, state.memberName, dashboard?.unreadNotifications ?: 0, onAction) }
                when {
                    dashboard != null -> content(state, dashboard, onAction)
                    state.error != null -> item(key = KEY_ERROR, contentType = KEY_ERROR) {
                        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                            AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
                        }
                    }
                    else -> item(key = KEY_LOADING, contentType = KEY_LOADING) { HomeShimmer() }
                }
            }
        }
    }
}

private fun LazyListScope.content(state: UiState, dashboard: Dashboard, onAction: (UiAction) -> Unit) {
    dashboard.salon.state?.let { salonState -> item(key = KEY_STATE, contentType = KEY_STATE) { AppSalonStateStrip(salonState) } }
    if (state.incomplete) {
        item(key = KEY_SETUP, contentType = KEY_SETUP) {
            AppWarningBanner(
                title = stringResource(Res.string.home_incomplete_title),
                body = stringResource(Res.string.home_incomplete_body),
                onClick = { onAction(UiAction.OnSetup) },
            )
        }
    }
    val warning = dashboard.subscriptionWarning
    if (state.showsSubscriptionWarning && warning != null) {
        item(key = KEY_SUBSCRIPTION, contentType = KEY_SUBSCRIPTION) {
            AppWarningBanner(
                title = pluralStringResource(Res.plurals.home_subscription_title, warning.daysRemaining, warning.daysRemaining),
                body = stringResource(Res.string.home_subscription_body),
                onClick = { onAction(UiAction.OnSubscription) },
            )
        }
    }
    val pending = dashboard.pending
    if (state.showsPending && pending != null) {
        item(key = KEY_PENDING, contentType = KEY_PENDING) { PendingSection(pending, state.nowMs, onAction) }
    }
    val today = dashboard.today
    if (today != null) {
        item(key = KEY_TODAY, contentType = KEY_TODAY) { TodaySection(today) }
        item(key = KEY_TIMELINE, contentType = KEY_TIMELINE) { TimelineTitle(state.ownBookingsOnly) }
        if (state.hasNoBookingsToday) {
            item(key = KEY_EMPTY, contentType = KEY_EMPTY) { NoBookingsToday(onAction) }
        } else {
            items(today.timeline, key = { ROW + it.id }, contentType = { ROW }) { booking -> TimelineRow(booking, onAction) }
        }
    }
    val stats = dashboard.quickStats
    if (state.showsStatistics && stats != null) {
        item(key = KEY_STATS, contentType = KEY_STATS) { QuickStatsSection(stats, onAction) }
    }
}

/** One placeholder for the whole screen (PRD M07 "unified shimmer"). */
@Composable
private fun HomeShimmer() {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space14)) {
        AppShimmerBox(Modifier.fillMaxWidth().height(AppTheme.sizes.avatar), AppTheme.shapes.large)
        repeat(SHIMMER_SECTIONS) { AppShimmerSection() }
    }
}

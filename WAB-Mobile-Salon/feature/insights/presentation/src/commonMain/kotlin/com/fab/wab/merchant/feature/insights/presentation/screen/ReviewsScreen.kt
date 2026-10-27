package com.fab.wab.merchant.feature.insights.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.designsystem.components.branch.AppBranchSwitcher
import com.fab.wab.merchant.designsystem.components.chip.AppFilterChip
import com.fab.wab.merchant.designsystem.components.dialog.AppContactSheet
import com.fab.wab.merchant.designsystem.components.feedback.AppEmptyState
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.selector.AppSegmentedTabs
import com.fab.wab.merchant.designsystem.components.shimmer.AppShimmerList
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.insights.domain.ReviewTarget
import com.fab.wab.merchant.feature.insights.presentation.analytics.InsightsAnalytics
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.ReviewsContract.UiAction
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.ReviewsContract.UiState
import com.fab.wab.merchant.feature.insights.presentation.resources.Res
import com.fab.wab.merchant.feature.insights.presentation.resources.reviews_all_staff
import com.fab.wab.merchant.feature.insights.presentation.resources.reviews_empty_body
import com.fab.wab.merchant.feature.insights.presentation.resources.reviews_empty_title
import com.fab.wab.merchant.feature.insights.presentation.resources.reviews_report_note
import com.fab.wab.merchant.feature.insights.presentation.resources.reviews_tab_salon
import com.fab.wab.merchant.feature.insights.presentation.resources.reviews_tab_staff
import com.fab.wab.merchant.feature.insights.presentation.resources.reviews_title
import org.jetbrains.compose.resources.stringResource

private const val KEY_HEADER = "header"
private const val KEY_SUMMARY = "summary"
private const val KEY_LOADING = "loading"
private const val KEY_ERROR = "error"
private const val KEY_EMPTY = "empty"
private const val KEY_MORE = "more"
private const val ROW = "review"
private const val CHIP = "staff"

/** PRD M20 (design 07 `on.reviews`): tabs, staff selector, summary with distribution, paginated reviews, Report. */
@Composable
fun ReviewsScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(InsightsAnalytics.SCREEN_REVIEWS)
    val currentOnAction by rememberUpdatedState(onAction)
    val spacing = AppTheme.spacing
    AppScreen(modifier = modifier, topBar = { AppTopBar(title = stringResource(Res.string.reviews_title), onBack = onBack) }) { padding ->
        AppPullToRefresh(
            refreshing = state.refreshing,
            onRefresh = { onAction(UiAction.OnRefresh) },
            modifier = Modifier.padding(padding),
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(spacing.space16),
                verticalArrangement = Arrangement.spacedBy(spacing.space10),
            ) {
                item(key = KEY_HEADER, contentType = KEY_HEADER) { Filters(state, onAction) }
                when {
                    state.loading -> item(key = KEY_LOADING, contentType = KEY_LOADING) { AppShimmerList() }
                    state.error != null -> item(key = KEY_ERROR, contentType = KEY_ERROR) {
                        AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
                    }
                    state.isEmpty -> item(key = KEY_EMPTY, contentType = KEY_EMPTY) {
                        AppEmptyState(
                            title = stringResource(Res.string.reviews_empty_title),
                            message = stringResource(Res.string.reviews_empty_body),
                        )
                    }
                    else -> {
                        item(key = KEY_SUMMARY, contentType = KEY_SUMMARY) { ReviewSummaryCard(state.summary) }
                        items(state.reviews, key = { it.id }, contentType = { ROW }) { review ->
                            ReviewRow(review, showStaff = state.target == ReviewTarget.STAFF) { onAction(UiAction.OnReport(review.id)) }
                        }
                    }
                }
                if (state.hasMore && !state.loading) {
                    // The footer appearing at the end of the list asks for the next page (infinite scroll).
                    item(key = KEY_MORE, contentType = KEY_MORE) {
                        LaunchedEffect(state.reviews.size) { currentOnAction(UiAction.OnLoadMore) }
                        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { AppLoadingIndicator() }
                    }
                }
            }
        }
    }
    ReportSheet(state, onAction)
}

@Composable
private fun Filters(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space10)) {
        AppSegmentedTabs(
            tabs = listOf(stringResource(Res.string.reviews_tab_salon), stringResource(Res.string.reviews_tab_staff)),
            selectedIndex = state.target.ordinal,
            onSelect = { onAction(UiAction.OnTarget(ReviewTarget.entries[it])) },
        )
        if (state.branchScope.showsSwitcher) {
            AppBranchSwitcher(
                branches = state.branchScope.branches,
                selectedId = state.branchScope.filter,
                onSelect = { onAction(UiAction.OnBranchSelect(it)) },
            )
        }
        if (state.showsStaffSelector) {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(spacing.space8)) {
                item(key = CHIP, contentType = CHIP) {
                    AppFilterChip(stringResource(Res.string.reviews_all_staff), state.staffId == null, { onAction(UiAction.OnStaff(null)) })
                }
                items(state.staffOptions, key = { CHIP + it.id }, contentType = { CHIP }) { staff ->
                    AppFilterChip(staff.firstName, state.staffId == staff.id, { onAction(UiAction.OnStaff(staff.id)) })
                }
            }
        }
    }
}

/** Contact WAB channels from the server config; the note carries the review reference (PRD M20 Report). */
@Composable
private fun ReportSheet(state: UiState, onAction: (UiAction) -> Unit) {
    val review = state.reporting ?: return
    val contact = state.contact
    AppContactSheet(
        onDismiss = { onAction(UiAction.OnDismissReport) },
        onCall = contact?.phone?.takeIf { it.isNotBlank() }?.let { { onAction(UiAction.OnReportCall) } },
        onWhatsApp = contact?.whatsapp?.takeIf { it.isNotBlank() }?.let { { onAction(UiAction.OnReportWhatsApp) } },
        onEmail = contact?.email?.takeIf { it.isNotBlank() }?.let { { onAction(UiAction.OnReportEmail) } },
        note = stringResource(Res.string.reviews_report_note, review.id),
    )
}

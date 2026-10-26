package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.salon.RatingSummary
import com.fab.wab.customer.core.domain.salon.Review
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.dialog.AppGlobalDialog
import com.fab.wab.customer.designsystem.components.dialog.GlobalDialogKind
import com.fab.wab.customer.designsystem.components.divider.AppDivider
import com.fab.wab.customer.designsystem.components.domain.ratingValueText
import com.fab.wab.customer.designsystem.components.feedback.AppContentState
import com.fab.wab.customer.designsystem.components.feedback.AppOfflineState
import com.fab.wab.customer.designsystem.components.feedback.contentStateOf
import com.fab.wab.customer.designsystem.components.layout.AppPagedList
import com.fab.wab.customer.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.navigation.AppTopBar
import com.fab.wab.customer.designsystem.components.rating.AppRatingStars
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerBox
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.state_error_title
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.salon.domain.model.ReviewTarget
import com.fab.wab.customer.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.customer.feature.salon.presentation.controller.contract.ReviewsContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.controller.contract.ReviewsContract.UiState
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.reviews_based_on
import com.fab.wab.customer.feature.salon.presentation.resources.reviews_empty
import com.fab.wab.customer.feature.salon.presentation.resources.reviews_staff_title
import com.fab.wab.customer.feature.salon.presentation.resources.reviews_title
import com.fab.wab.customer.feature.salon.presentation.resources.salon_retry
import com.fab.wab.customer.feature.salon.presentation.resources.salon_review_add_button
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

/** S08 / S09: summary card, paged outlined review cards, sticky "+ Add review" (auth-gated), form sheet. */
@Composable
fun ReviewsScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonAnalytics.REVIEWS_SCREEN)
    val title = if (state.target is ReviewTarget.Staff) Res.string.reviews_staff_title else Res.string.reviews_title
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(title), onBack = onBack) },
        bottomBar = {
            Column(Modifier.fillMaxWidth().background(AppTheme.colors.background)) {
                AppDivider()
                AppPrimaryButton(
                    text = stringResource(Res.string.salon_review_add_button),
                    onClick = { onAction(UiAction.OnAddReviewClick) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = AppTheme.spacing.space20, vertical = AppTheme.spacing.space12)
                        .windowInsetsPadding(WindowInsets.navigationBars),
                )
            }
        },
    ) { padding ->
        AppPullToRefresh(
            refreshing = state.refreshing,
            onRefresh = { onAction(UiAction.OnRefresh) },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            ReviewsContent(state, onAction)
        }
    }
    state.form?.let { ReviewFormSheet(it, onAction) }
    if (state.authDialog) {
        AppGlobalDialog(
            kind = GlobalDialogKind.AuthRequired,
            onConfirm = { onAction(UiAction.OnDialogConfirm) },
            onDismiss = { onAction(UiAction.OnDialogDismiss) },
        )
    }
}

@Composable
private fun ReviewsContent(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val content = contentStateOf(
        isLoading = state.loading,
        isOffline = state.offline,
        errorMessage = state.error,
        isEmpty = state.loaded && state.items.isEmpty(),
        hasContent = state.items.isNotEmpty(),
    )
    when (content) {
        AppContentState.Loading -> ReviewsShimmer()
        AppContentState.Offline -> AppOfflineState(onRetry = { onAction(UiAction.OnRetry) }, modifier = Modifier.fillMaxSize())
        is AppContentState.Error -> SalonStatePlaceholder(
            icon = SalonIcons.Warning,
            title = stringResource(CoreRes.string.state_error_title),
            actionText = stringResource(Res.string.salon_retry),
            onAction = { onAction(UiAction.OnRetry) },
            circleSize = SalonDesign.reviewsStateCircle,
            iconSize = SalonDesign.reviewsStateIcon,
        )
        AppContentState.Empty -> SalonStatePlaceholder(
            icon = SalonIcons.StarEmpty,
            title = stringResource(Res.string.reviews_empty),
            circleSize = SalonDesign.reviewsStateCircle,
            iconSize = SalonDesign.reviewsStateIcon,
        )
        AppContentState.Content -> {
            val rows = remember(state.summary, state.items) { reviewRowsOf(state.summary, state.items) }
            AppPagedList(
                items = rows,
                itemKey = { it.key },
                hasMore = state.hasMore,
                loadingMore = state.loadingMore,
                onLoadMore = { onAction(UiAction.OnLoadMore) },
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    top = spacing.space4,
                    start = spacing.space20,
                    end = spacing.space20,
                    bottom = spacing.space20,
                ),
                footer = { ReviewShimmerCard() },
            ) { row ->
                when (row) {
                    is ReviewRow.Summary -> SummaryCard(row.summary)
                    is ReviewRow.Item -> SalonReviewCard(row.review, ReviewCardStyle.List)
                }
            }
        }
    }
}

/** The summary card scrolls with the list, so it is the first row of the paged list. */
internal sealed interface ReviewRow {
    val key: String

    data class Summary(val summary: RatingSummary) : ReviewRow {
        override val key: String get() = SUMMARY_KEY
    }

    data class Item(val review: Review) : ReviewRow {
        override val key: String get() = review.id
    }
}

private const val SUMMARY_KEY = "summary"

internal fun reviewRowsOf(summary: RatingSummary?, items: List<Review>): List<ReviewRow> =
    listOfNotNull(summary?.let { ReviewRow.Summary(it) }) + items.map { ReviewRow.Item(it) }

/** Surface card: Playfair average in accent, amber stars and "Based on N reviews". */
@Composable
private fun SummaryCard(summary: RatingSummary) {
    val spacing = AppTheme.spacing
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(AppTheme.colors.surface, remember { RoundedCornerShape(SalonDesign.summaryRadius) })
            .padding(spacing.space16),
        horizontalArrangement = Arrangement.spacedBy(spacing.space16),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppText(text = ratingValueText(summary.average), style = AppTheme.typography.display, color = AppTheme.colors.accent, maxLines = 1)
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space4)) {
            AppRatingStars(rating = summary.average, starSize = SalonDesign.summaryStar)
            AppText(
                text = pluralStringResource(Res.plurals.reviews_based_on, summary.count, summary.count),
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colors.muted,
            )
        }
    }
}

@Composable
private fun ReviewShimmerCard(modifier: Modifier = Modifier) {
    AppShimmerBox(modifier.fillMaxWidth().height(SalonDesign.reviewShimmerHeight), shape = AppTheme.shapes.large)
}

@Composable
private fun ReviewsShimmer() {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier.fillMaxWidth().padding(top = spacing.space4, start = spacing.space20, end = spacing.space20),
        verticalArrangement = Arrangement.spacedBy(spacing.space10),
    ) {
        repeat(SalonDesign.REVIEW_SHIMMER_COUNT) { ReviewShimmerCard() }
    }
}

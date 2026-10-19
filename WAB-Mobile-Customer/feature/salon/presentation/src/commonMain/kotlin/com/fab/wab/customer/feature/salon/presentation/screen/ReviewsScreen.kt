package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.customer.designsystem.components.dialog.AppGlobalDialog
import com.fab.wab.customer.designsystem.components.dialog.GlobalDialogKind
import com.fab.wab.customer.designsystem.components.domain.AppReviewItem
import com.fab.wab.customer.designsystem.components.domain.ratingValueText
import com.fab.wab.customer.designsystem.components.feedback.AppEmptyState
import com.fab.wab.customer.designsystem.components.feedback.AppStateContent
import com.fab.wab.customer.designsystem.components.feedback.contentStateOf
import com.fab.wab.customer.designsystem.components.layout.AppPagedList
import com.fab.wab.customer.designsystem.components.layout.AppPullToRefresh
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.navigation.AppTopBar
import com.fab.wab.customer.designsystem.components.rating.AppRatingInput
import com.fab.wab.customer.designsystem.components.rating.AppRatingStars
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerList
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.textfield.AppTextField
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.salon.domain.model.ReviewDefaults
import com.fab.wab.customer.feature.salon.domain.model.ReviewTarget
import com.fab.wab.customer.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.customer.feature.salon.presentation.controller.contract.ReviewsContract.ReviewForm
import com.fab.wab.customer.feature.salon.presentation.controller.contract.ReviewsContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.controller.contract.ReviewsContract.UiState
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.review_comment_hint
import com.fab.wab.customer.feature.salon.presentation.resources.review_counter
import com.fab.wab.customer.feature.salon.presentation.resources.review_form_title
import com.fab.wab.customer.feature.salon.presentation.resources.review_submit
import com.fab.wab.customer.feature.salon.presentation.resources.reviews_empty
import com.fab.wab.customer.feature.salon.presentation.resources.reviews_staff_title
import com.fab.wab.customer.feature.salon.presentation.resources.reviews_title
import com.fab.wab.customer.feature.salon.presentation.resources.salon_review_add
import com.fab.wab.customer.feature.salon.presentation.resources.salon_reviews_summary
import org.jetbrains.compose.resources.stringResource

/** S08 / S09: summary header, paged review list, sticky Add review (auth-gated), form sheet. */
@Composable
fun ReviewsScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonAnalytics.REVIEWS_SCREEN)
    val spacing = AppTheme.spacing
    val title = if (state.target is ReviewTarget.Staff) Res.string.reviews_staff_title else Res.string.reviews_title
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(title), onBack = onBack) },
        bottomBar = {
            AppPrimaryButton(
                text = stringResource(Res.string.salon_review_add),
                onClick = { onAction(UiAction.OnAddReviewClick) },
                modifier = Modifier.fillMaxWidth().padding(spacing.space16),
            )
        },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            state.summary?.takeIf { it.count > 0 }?.let { summary ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16, vertical = spacing.space8),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(spacing.space8),
                ) {
                    AppRatingStars(rating = summary.average)
                    AppText(
                        text = stringResource(Res.string.salon_reviews_summary, ratingValueText(summary.average), summary.count),
                        color = AppTheme.colors.muted,
                    )
                }
            }
            AppPullToRefresh(refreshing = state.refreshing, onRefresh = { onAction(UiAction.OnRefresh) }) {
                AppStateContent(
                    state = contentStateOf(
                        isLoading = state.loading,
                        isOffline = state.offline,
                        errorMessage = state.error,
                        isEmpty = state.loaded && state.items.isEmpty(),
                        hasContent = state.items.isNotEmpty(),
                    ),
                    onRetry = { onAction(UiAction.OnRetry) },
                    modifier = Modifier.fillMaxSize(),
                    loading = { AppShimmerList(Modifier.padding(spacing.space16)) },
                    empty = { AppEmptyState(title = stringResource(Res.string.reviews_empty)) },
                ) {
                    AppPagedList(
                        items = state.items,
                        itemKey = { it.id },
                        hasMore = state.hasMore,
                        loadingMore = state.loadingMore,
                        onLoadMore = { onAction(UiAction.OnLoadMore) },
                        modifier = Modifier.fillMaxSize(),
                    ) { review -> AppReviewItem(review = review.toUi()) }
                }
            }
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
private fun ReviewFormSheet(form: ReviewForm, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = { onAction(UiAction.OnFormDismiss) }) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(spacing.space16),
            verticalArrangement = Arrangement.spacedBy(spacing.space16),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            AppText(text = stringResource(Res.string.review_form_title), style = AppTheme.typography.titleMedium)
            AppRatingInput(value = form.rating, onValueChange = { onAction(UiAction.OnRatingChange(it)) })
            AppTextField(
                value = form.comment,
                onValueChange = { onAction(UiAction.OnCommentChange(it)) },
                modifier = Modifier.fillMaxWidth(),
                placeholder = stringResource(Res.string.review_comment_hint),
                singleLine = false,
            )
            AppText(
                text = stringResource(Res.string.review_counter, form.comment.length, ReviewDefaults.MAX_COMMENT_LENGTH),
                color = AppTheme.colors.muted,
                style = AppTheme.typography.bodySmall,
                modifier = Modifier.fillMaxWidth(),
            )
            AppPrimaryButton(
                text = stringResource(Res.string.review_submit),
                onClick = { onAction(UiAction.OnSubmit) },
                modifier = Modifier.fillMaxWidth(),
                enabled = form.canSubmit,
                loading = form.submitting,
            )
        }
    }
}


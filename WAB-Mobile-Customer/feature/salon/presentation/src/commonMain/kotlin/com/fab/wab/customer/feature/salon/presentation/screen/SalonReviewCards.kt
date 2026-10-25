package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import com.fab.wab.customer.core.common.TimeFormat
import com.fab.wab.customer.core.domain.salon.RatingSummary
import com.fab.wab.customer.core.domain.salon.Review
import com.fab.wab.customer.designsystem.components.domain.ratingValueText
import com.fab.wab.customer.designsystem.components.rating.AppRatingStars
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.salon_review_add_button
import com.fab.wab.customer.feature.salon.presentation.resources.salon_review_branch
import com.fab.wab.customer.feature.salon.presentation.resources.salon_reviews_all
import com.fab.wab.customer.feature.salon.presentation.resources.salon_reviews_count
import com.fab.wab.customer.feature.salon.presentation.resources.salon_reviews_count_short
import com.fab.wab.customer.feature.salon.presentation.resources.salon_reviews_of_five
import com.fab.wab.customer.feature.salon.presentation.resources.salon_reviews_see_more
import org.jetbrains.compose.resources.stringResource

/** The three review cards of the design: S07 (surface, 2 lines + See more), S07a (surface, compact), S08 (outlined, full text). */
internal enum class ReviewCardStyle { SalonPreview, StaffPreview, List }

@Composable
internal fun SalonReviewCard(review: Review, style: ReviewCardStyle, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val typography = AppTheme.typography
    val compact = style == ReviewCardStyle.StaffPreview
    val shape = if (compact) AppTheme.shapes.medium else AppTheme.shapes.large
    val container = when (style) {
        ReviewCardStyle.List -> Modifier.border(AppTheme.sizes.hairline, colors.line, shape)
        else -> Modifier.background(colors.surface, shape)
    }
    val padding = if (compact) {
        Modifier.padding(horizontal = spacing.space14, vertical = spacing.space12)
    } else {
        Modifier.padding(spacing.space14)
    }
    Column(modifier = modifier.fillMaxWidth().then(container).then(padding)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AppText(
                text = review.customerName,
                style = (if (compact) typography.labelMedium else typography.titleSmall).copy(fontWeight = FontWeight.Bold),
                maxLines = 1,
                modifier = Modifier.weight(1f, fill = false),
            )
            AppText(
                text = TimeFormat.isoDateText(review.createdAt) ?: review.createdAt,
                style = typography.labelSmall,
                color = colors.faint,
                maxLines = 1,
            )
        }
        AppRatingStars(
            rating = review.rating,
            starSize = SalonDesign.ratingStarSmall,
            modifier = Modifier.padding(vertical = if (compact) spacing.space4 else spacing.space6),
        )
        review.branch?.let { branch ->
            AppText(
                text = stringResource(Res.string.salon_review_branch, branch.name),
                style = typography.labelSmall,
                color = colors.accent,
                maxLines = 1,
                modifier = Modifier.padding(bottom = spacing.space4),
            )
        }
        AppText(
            text = review.comment.orEmpty(),
            style = typography.bodySmall,
            color = colors.muted,
            maxLines = if (style == ReviewCardStyle.List) Int.MAX_VALUE else SalonDesign.REVIEW_PREVIEW_LINES,
        )
        if (style == ReviewCardStyle.SalonPreview) {
            AppText(
                text = stringResource(Res.string.salon_reviews_see_more),
                style = typography.labelMedium,
                color = colors.accent,
                modifier = Modifier.padding(top = spacing.space4),
            )
        }
    }
}

/** `<b>4.9 / 5</b> · 214 reviews`: the bold ink part and the muted count of the S07 / S07a section headers. */
@Composable
internal fun reviewSummaryText(summary: RatingSummary, withReviewsWord: Boolean = true) = buildAnnotatedString {
    val colors = AppTheme.colors
    withStyle(SpanStyle(color = colors.ink, fontWeight = FontWeight.Bold)) {
        append(stringResource(Res.string.salon_reviews_of_five, ratingValueText(summary.average)))
    }
    val count = if (withReviewsWord) Res.string.salon_reviews_count else Res.string.salon_reviews_count_short
    append(stringResource(count, summary.count))
}

/** The muted "no reviews" box of S07 / S07a. */
@Composable
internal fun NoReviewsBox(text: String, modifier: Modifier = Modifier, compact: Boolean = false) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(AppTheme.colors.surface, if (compact) AppTheme.shapes.medium else AppTheme.shapes.large)
            .padding(if (compact) AppTheme.spacing.space20 else SalonDesign.reviewEmptyPadding),
        contentAlignment = Alignment.Center,
    ) {
        AppText(text = text, style = AppTheme.typography.bodyMedium, color = AppTheme.colors.muted, textAlign = TextAlign.Center)
    }
}

/** "See all" (only with reviews) + "+ Add review", both 46 dp high and sharing the row. */
@Composable
internal fun ReviewActionsRow(hasReviews: Boolean, onSeeAll: () -> Unit, onAdd: () -> Unit, modifier: Modifier = Modifier) {
    Row(modifier = modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space10)) {
        if (hasReviews) {
            SalonButton(text = stringResource(Res.string.salon_reviews_all), onClick = onSeeAll, modifier = Modifier.weight(1f))
        }
        SalonButton(
            text = stringResource(Res.string.salon_review_add_button),
            onClick = onAdd,
            modifier = Modifier.weight(1f),
            kind = SalonButtonKind.Soft,
        )
    }
}

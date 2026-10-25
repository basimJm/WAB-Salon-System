package com.fab.wab.merchant.feature.insights.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.common.TimeFormat
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.format.oneDecimalText
import com.fab.wab.merchant.designsystem.components.rating.AppRatingStars
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.insights.domain.Review
import com.fab.wab.merchant.feature.insights.domain.ReviewSummary
import com.fab.wab.merchant.feature.insights.domain.ReviewsDefaults
import com.fab.wab.merchant.feature.insights.presentation.resources.Res
import com.fab.wab.merchant.feature.insights.presentation.resources.insights_meta_pair
import com.fab.wab.merchant.feature.insights.presentation.resources.reviews_count
import com.fab.wab.merchant.feature.insights.presentation.resources.reviews_report
import com.fab.wab.merchant.feature.insights.presentation.resources.reviews_staff_for
import com.fab.wab.merchant.feature.insights.presentation.resources.reviews_star_label
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

/** Average (big), stars, count, then one bar per star from 5 to 1. */
@Composable
internal fun ReviewSummaryCard(summary: ReviewSummary) {
    val spacing = AppTheme.spacing
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Row(horizontalArrangement = Arrangement.spacedBy(spacing.space16), verticalAlignment = Alignment.CenterVertically) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(spacing.space4)) {
                AppText(
                    text = oneDecimalText(summary.average),
                    style = AppTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                )
                AppRatingStars(rating = summary.average.toFloat())
                AppText(
                    text = pluralStringResource(Res.plurals.reviews_count, summary.count, summary.count),
                    style = AppTheme.typography.labelSmall,
                    color = AppTheme.colors.muted,
                )
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(spacing.space4)) {
                ReviewsDefaults.STARS.forEach { star -> DistributionRow(star, summary.share(star)) }
            }
        }
    }
}

@Composable
private fun DistributionRow(star: Int, share: Float) {
    val colors = AppTheme.colors
    Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8), verticalAlignment = Alignment.CenterVertically) {
        AppText(text = stringResource(Res.string.reviews_star_label, star), style = AppTheme.typography.labelSmall, color = colors.muted)
        LinearProgressIndicator(
            progress = { share },
            modifier = Modifier.weight(1f),
            color = colors.accent,
            trackColor = colors.soft,
        )
    }
}

/** Customer, stars, date (and the staff member on the staff tab), comment, Report (no edit / delete). */
@Composable
internal fun ReviewRow(review: Review, showStaff: Boolean, onReport: () -> Unit) {
    val spacing = AppTheme.spacing
    AppCard(modifier = Modifier.fillMaxWidth(), contentPadding = spacing.space12) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space6)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space8)) {
                AppText(
                    text = review.customerName,
                    style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    maxLines = 1,
                    modifier = Modifier.weight(1f),
                )
                AppRatingStars(rating = review.rating.toFloat())
            }
            val date = TimeFormat.isoDateText(review.createdAt).orEmpty()
            val staff = review.staff?.takeIf { showStaff }?.let { stringResource(Res.string.reviews_staff_for, it.firstName) }
            val meta = listOfNotNull(date.takeIf { it.isNotBlank() }, staff, review.branchName)
            if (meta.isNotEmpty()) {
                AppText(
                    text = meta.reduce { first, second -> stringResource(Res.string.insights_meta_pair, first, second) },
                    style = AppTheme.typography.labelSmall,
                    color = AppTheme.colors.muted,
                )
            }
            review.comment?.let { AppText(text = it, style = AppTheme.typography.bodyMedium) }
            AppButton(stringResource(Res.string.reviews_report), onReport, kind = ButtonKind.Text)
        }
    }
}

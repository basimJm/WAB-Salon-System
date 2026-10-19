package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.designsystem.components.button.AppTextButton
import com.fab.wab.customer.designsystem.components.domain.AppReviewItem
import com.fab.wab.customer.designsystem.components.domain.AppSalonServiceRow
import com.fab.wab.customer.designsystem.components.domain.AppStaffItem
import com.fab.wab.customer.designsystem.components.domain.ratingValueText
import com.fab.wab.customer.designsystem.components.media.AppMediaTile
import com.fab.wab.customer.designsystem.components.section.AppSectionHeader
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.salon_gallery
import com.fab.wab.customer.feature.salon.presentation.resources.salon_review_add
import com.fab.wab.customer.feature.salon.presentation.resources.salon_reviews
import com.fab.wab.customer.feature.salon.presentation.resources.salon_reviews_all
import com.fab.wab.customer.feature.salon.presentation.resources.salon_reviews_empty
import com.fab.wab.customer.feature.salon.presentation.resources.salon_reviews_summary
import com.fab.wab.customer.feature.salon.presentation.resources.salon_services
import com.fab.wab.customer.feature.salon.presentation.resources.salon_staff
import org.jetbrains.compose.resources.stringResource

@Composable
internal fun StaffSection(salon: SalonDetails, onAction: (UiAction) -> Unit) {
    if (salon.staff.isEmpty()) return
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12)) {
        AppSectionHeader(title = stringResource(Res.string.salon_staff))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12)) {
            items(salon.staff, key = { it.id }) { member ->
                AppStaffItem(staff = member.toUi(), onClick = { onAction(UiAction.OnStaffClick(member.id)) })
            }
        }
    }
}

/** Header with the salon's own rating (independent of staff ratings), first 3 reviews, See all, Add review. */
@Composable
internal fun ReviewsSection(salon: SalonDetails, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val summary = salon.reviews.summary
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space12)) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            AppSectionHeader(title = stringResource(Res.string.salon_reviews), modifier = Modifier.weight(1f))
            if (summary.count > 0) {
                AppText(
                    text = stringResource(Res.string.salon_reviews_summary, ratingValueText(summary.average), summary.count),
                    color = AppTheme.colors.muted,
                    style = AppTheme.typography.bodySmall,
                )
            }
        }
        if (salon.reviews.latest.isEmpty()) {
            AppText(text = stringResource(Res.string.salon_reviews_empty), color = AppTheme.colors.muted)
        } else {
            salon.reviews.latest.take(REVIEW_PREVIEW_COUNT).forEach { review -> AppReviewItem(review = review.toUi()) }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(spacing.space8)) {
            if (summary.count > 0) {
                AppTextButton(text = stringResource(Res.string.salon_reviews_all), onClick = { onAction(UiAction.OnAllReviewsClick) })
            }
            AppTextButton(text = stringResource(Res.string.salon_review_add), onClick = { onAction(UiAction.OnAddReviewClick) })
        }
    }
}

@Composable
internal fun ServicesSection(salon: SalonDetails, onAction: (UiAction) -> Unit) {
    if (salon.services.isEmpty()) return
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8)) {
        AppSectionHeader(title = stringResource(Res.string.salon_services))
        salon.services.forEach { service ->
            AppSalonServiceRow(service = service.toUi(), onClick = { onAction(UiAction.OnServiceClick(service.id)) })
        }
    }
}

/** Instagram-style grid built from rows (the page already scrolls, so no nested lazy grid). */
@Composable
internal fun GallerySection(salon: SalonDetails, onAction: (UiAction) -> Unit) {
    if (salon.gallery.isEmpty()) return
    val columns = AppTheme.adaptive.galleryColumns
    val gap = AppTheme.spacing.space2
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12)) {
        AppSectionHeader(title = stringResource(Res.string.salon_gallery))
        Column(verticalArrangement = Arrangement.spacedBy(gap)) {
            salon.gallery.chunked(columns).forEachIndexed { rowIndex, row ->
                Row(horizontalArrangement = Arrangement.spacedBy(gap), modifier = Modifier.fillMaxWidth()) {
                    row.forEachIndexed { column, item ->
                        AppMediaTile(
                            item = item.toUi(),
                            onClick = { onAction(UiAction.OnGalleryClick(rowIndex * columns + column)) },
                            modifier = Modifier.weight(1f),
                        )
                    }
                    repeat(columns - row.size) { Spacer(Modifier.weight(1f)) }
                }
            }
        }
    }
}

private const val REVIEW_PREVIEW_COUNT = 3

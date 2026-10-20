package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import com.fab.wab.customer.core.domain.salon.GalleryItem
import com.fab.wab.customer.core.domain.salon.MediaType
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.core.domain.salon.SalonService
import com.fab.wab.customer.core.domain.salon.StaffPreview
import com.fab.wab.customer.core.domain.salon.StaffStatus
import com.fab.wab.customer.designsystem.components.avatar.AppAvatar
import com.fab.wab.customer.designsystem.components.divider.AppDivider
import com.fab.wab.customer.designsystem.components.image.AppImage
import com.fab.wab.customer.designsystem.components.image.AppImageFallback
import com.fab.wab.customer.designsystem.components.section.AppSectionHeader
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.media_video
import com.fab.wab.customer.designsystem.resources.price_jod
import com.fab.wab.customer.designsystem.resources.service_duration_minutes
import com.fab.wab.customer.designsystem.resources.staff_on_duty
import com.fab.wab.customer.designsystem.resources.staff_on_leave
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.salon_gallery
import com.fab.wab.customer.feature.salon.presentation.resources.salon_reviews
import com.fab.wab.customer.feature.salon.presentation.resources.salon_reviews_empty
import com.fab.wab.customer.feature.salon.presentation.resources.salon_services
import com.fab.wab.customer.feature.salon.presentation.resources.salon_staff
import org.jetbrains.compose.resources.stringResource

private const val STAFF_TYPE = "staff"

/** Section headers of S07: `margin: 26px 0 12px` (24 for the staff row, 8 below services) inside the 20 px gutters. */
@Composable
private fun Modifier.sectionHeaderPadding(top: Dp = SalonDesign.sectionTop, bottom: Dp = AppTheme.spacing.space12): Modifier =
    padding(top = top, bottom = bottom, start = AppTheme.spacing.space20, end = AppTheme.spacing.space20)

/** Horizontal row of 64 px avatars with the duty dot, first name and the green / rose availability line. */
@Composable
internal fun StaffSection(salon: SalonDetails, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    if (salon.staff.isEmpty()) return
    val spacing = AppTheme.spacing
    Column(modifier) {
        AppSectionHeader(
            title = stringResource(Res.string.salon_staff),
            modifier = Modifier.sectionHeaderPadding(top = SalonDesign.staffSectionTop),
        )
        LazyRow(
            contentPadding = PaddingValues(start = spacing.space20, end = spacing.space20, bottom = spacing.space4),
            horizontalArrangement = Arrangement.spacedBy(spacing.space14),
        ) {
            items(salon.staff, key = { it.id }, contentType = { STAFF_TYPE }) { member ->
                StaffAvatarItem(member, onClick = { onAction(UiAction.OnStaffClick(member.id)) })
            }
        }
    }
}

@Composable
private fun StaffAvatarItem(member: StaffPreview, onClick: () -> Unit) {
    val colors = AppTheme.colors
    val onDuty = member.status == StaffStatus.ON_DUTY
    val tone = if (onDuty) colors.success else colors.danger
    Column(
        modifier = Modifier.width(SalonDesign.staffItemWidth).clip(AppTheme.shapes.small).clickable(role = Role.Button, onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6),
    ) {
        Box(Modifier.size(SalonDesign.staffAvatar)) {
            AppAvatar(name = member.firstName, imageUrl = member.photoUrl, size = SalonDesign.staffAvatar)
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(SalonDesign.staffDotInset)
                    .size(SalonDesign.staffDot)
                    .border(SalonDesign.staffDotBorder, colors.background, AppTheme.shapes.circle)
                    .padding(SalonDesign.staffDotBorder)
                    .background(tone, AppTheme.shapes.circle),
            )
        }
        AppText(text = member.firstName, style = AppTheme.typography.labelMedium, maxLines = 1, textAlign = TextAlign.Center)
        AppText(
            text = stringResource(if (onDuty) CoreRes.string.staff_on_duty else CoreRes.string.staff_on_leave),
            style = AppTheme.typography.labelSmall,
            color = tone,
            maxLines = 1,
            textAlign = TextAlign.Center,
        )
    }
}

/** Header with the salon's own rating (independent of staff ratings), first 3 reviews, See all, + Add review. */
@Composable
internal fun ReviewsSection(salon: SalonDetails, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    val summary = salon.reviews.summary
    val hasReviews = summary.count > 0 && salon.reviews.latest.isNotEmpty()
    Column(modifier) {
        Row(
            modifier = Modifier.fillMaxWidth().sectionHeaderPadding(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AppSectionHeader(title = stringResource(Res.string.salon_reviews), modifier = Modifier.weight(1f))
            if (hasReviews) AppText(text = reviewSummaryText(summary), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
        }
        Column(modifier = Modifier.padding(horizontal = spacing.space20), verticalArrangement = Arrangement.spacedBy(spacing.space10)) {
            if (hasReviews) {
                salon.reviews.latest.take(SalonDesign.REVIEW_PREVIEW_COUNT).forEach { SalonReviewCard(it, ReviewCardStyle.SalonPreview) }
            } else {
                NoReviewsBox(stringResource(Res.string.salon_reviews_empty))
            }
            ReviewActionsRow(
                hasReviews = hasReviews,
                onSeeAll = { onAction(UiAction.OnAllReviewsClick) },
                onAdd = { onAction(UiAction.OnAddReviewClick) },
            )
        }
    }
}

/** Borderless rows separated by hairlines: 52 px image, name, duration, accent price. */
@Composable
internal fun ServicesSection(salon: SalonDetails, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    if (salon.services.isEmpty()) return
    val spacing = AppTheme.spacing
    Column(modifier) {
        AppSectionHeader(
            title = stringResource(Res.string.salon_services),
            modifier = Modifier.sectionHeaderPadding(bottom = spacing.space8),
        )
        Column(Modifier.padding(horizontal = spacing.space20)) {
            salon.services.forEach { service -> ServiceRow(service, onClick = { onAction(UiAction.OnServiceClick(service.id)) }) }
        }
    }
}

@Composable
private fun ServiceRow(service: SalonService, onClick: () -> Unit) {
    val spacing = AppTheme.spacing
    val imageShape = remember { RoundedCornerShape(SalonDesign.serviceImageRadius) }
    Column {
        Row(
            modifier = Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = onClick).padding(vertical = spacing.space12),
            horizontalArrangement = Arrangement.spacedBy(spacing.space12),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.size(SalonDesign.serviceImage).clip(imageShape)) {
                val image = service.imageUrl
                if (image != null) AppImage(url = image, modifier = Modifier.fillMaxSize()) else AppImageFallback()
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(spacing.space2)) {
                AppText(text = service.name, style = AppTheme.typography.titleSmall, maxLines = 1)
                AppText(
                    text = stringResource(CoreRes.string.service_duration_minutes, service.durationMinutes),
                    style = AppTheme.typography.bodySmall,
                    color = AppTheme.colors.muted,
                )
            }
            AppText(
                text = stringResource(CoreRes.string.price_jod, service.price),
                style = AppTheme.typography.titleSmall,
                color = AppTheme.colors.accent,
                maxLines = 1,
            )
        }
        AppDivider()
    }
}

/** Instagram-style grid (3 px gaps, 6 px radius) built from rows: the page already scrolls, so no nested lazy grid. */
@Composable
internal fun GallerySection(salon: SalonDetails, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    if (salon.gallery.isEmpty()) return
    val spacing = AppTheme.spacing
    val columns = AppTheme.adaptive.galleryColumns
    Column(modifier) {
        AppSectionHeader(
            title = stringResource(Res.string.salon_gallery),
            modifier = Modifier.sectionHeaderPadding(),
        )
        Column(
            modifier = Modifier.padding(horizontal = spacing.space20),
            verticalArrangement = Arrangement.spacedBy(SalonDesign.galleryGap),
        ) {
            salon.gallery.chunked(columns).forEachIndexed { rowIndex, row ->
                Row(horizontalArrangement = Arrangement.spacedBy(SalonDesign.galleryGap), modifier = Modifier.fillMaxWidth()) {
                    row.forEachIndexed { column, item ->
                        GalleryTile(item, onClick = { onAction(UiAction.OnGalleryClick(rowIndex * columns + column)) }, Modifier.weight(1f))
                    }
                    repeat(columns - row.size) { Spacer(Modifier.weight(1f)) }
                }
            }
        }
    }
}

@Composable
private fun GalleryTile(item: GalleryItem, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    Box(modifier = modifier.aspectRatio(1f).clip(AppTheme.shapes.extraSmall).clickable(role = Role.Button, onClick = onClick)) {
        AppImage(url = item.thumbnailUrl ?: item.url, modifier = Modifier.fillMaxSize())
        if (item.type == MediaType.VIDEO) {
            Box(
                modifier = Modifier.fillMaxSize().background(colors.shadow.copy(alpha = SalonDesign.VIDEO_SCRIM_ALPHA)),
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    modifier = Modifier
                        .size(SalonDesign.galleryPlayBadge)
                        .background(colors.onMedia.copy(alpha = SalonDesign.PLAY_BADGE_ALPHA), AppTheme.shapes.circle),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = AppIcons.Play,
                        contentDescription = stringResource(CoreRes.string.media_video),
                        tint = colors.gradientStart,
                        modifier = Modifier.size(SalonDesign.galleryPlayIcon),
                    )
                }
            }
        }
    }
}

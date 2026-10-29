package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.Dp
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.designsystem.components.domain.businessText
import com.fab.wab.customer.designsystem.components.avatar.AppAvatar
import com.fab.wab.customer.designsystem.components.domain.ratingValueText
import com.fab.wab.customer.designsystem.components.image.AppImage
import com.fab.wab.customer.designsystem.components.image.AppImageFallback
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerBox
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.salon_hours_separator
import com.fab.wab.customer.designsystem.resources.salon_open
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.softShadow
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.salon_closed_now
import com.fab.wab.customer.feature.salon.presentation.resources.salon_cover
import com.fab.wab.customer.feature.salon.presentation.resources.salon_rating_count
import org.jetbrains.compose.resources.stringResource

/** Cover (180, radius 22) with the 96 px logo overlapping by 50 px, then name, type · audience (§5.19), status + rating and the location link. */
@Composable
internal fun SalonHeader(salon: SalonDetails, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    Column(modifier) {
        CoverWithLogo(salon)
        Column(
            modifier = Modifier.fillMaxWidth().padding(top = spacing.space10, start = spacing.space20, end = spacing.space20),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            AppText(
                text = salon.name,
                style = AppTheme.typography.headlineMedium,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = spacing.space4),
            )
            AppText(
                text = businessText(salon.businessType, salon.audience),
                style = AppTheme.typography.labelMedium,
                color = AppTheme.colors.accent,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = spacing.space6),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space8), verticalAlignment = Alignment.CenterVertically) {
                SalonStatusBadge(text = statusText(salon), positive = salon.isOpenNow)
                RatingLine(salon)
            }
            LocationLink(salon, onAction)
        }
    }
}

@Composable
private fun CoverWithLogo(salon: SalonDetails) {
    val logoOuter = SalonDesign.logoOuter
    val coverDescription = stringResource(Res.string.salon_cover)
    Box(modifier = Modifier.fillMaxWidth().padding(bottom = logoOuter - SalonDesign.logoOverlap)) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = AppTheme.spacing.space20)
                .height(SalonDesign.coverHeight)
                .clip(AppTheme.shapes.extraLarge),
        ) {
            val cover = salon.coverUrl
            if (cover != null) {
                AppImage(modifier = Modifier.fillMaxSize(), url = cover, contentDescription = coverDescription)
            } else {
                AppImageFallback()
            }
        }
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .offset(y = logoOuter - SalonDesign.logoOverlap)
                .size(logoOuter)
                .softShadow(
                    SalonDesign.logoShadow,
                    AppTheme.colors.shadow.copy(alpha = SalonDesign.LOGO_SHADOW_ALPHA),
                    AppTheme.shapes.circle,
                )
                .background(AppTheme.colors.background, AppTheme.shapes.circle)
                .padding(SalonDesign.logoBorder),
        ) {
            AppAvatar(name = salon.name, imageUrl = salon.profileImageUrl, size = SalonDesign.logoSize)
        }
    }
}

/** `Open · 10:00 AM – 10:00 PM` or `Closed now` (the server reason when it sends one). */
@Composable
private fun statusText(salon: SalonDetails): String {
    val hours = salon.todayHours?.text()
    return when {
        salon.isOpenNow && hours != null ->
            stringResource(CoreRes.string.salon_open) + stringResource(CoreRes.string.salon_hours_separator) + hours
        salon.isOpenNow -> stringResource(CoreRes.string.salon_open)
        else -> salon.closedReason ?: stringResource(Res.string.salon_closed_now)
    }
}

/** 13 px amber star, bold value, faint `(count)`. */
@Composable
private fun RatingLine(salon: SalonDetails) {
    Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2), verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = AppIcons.Star,
            contentDescription = null,
            tint = AppTheme.colors.warning,
            modifier = Modifier.size(SalonDesign.ratingStarSmall),
        )
        AppText(text = ratingValueText(salon.rating.average), style = AppTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold))
        AppText(
            text = stringResource(Res.string.salon_rating_count, salon.rating.count),
            style = AppTheme.typography.labelMedium,
            color = AppTheme.colors.faint,
        )
    }
}

/** Underlined accent link with the pin icon → maps chooser (PRD S07 item 4); hidden without a location text. */
@Composable
private fun LocationLink(salon: SalonDetails, onAction: (UiAction) -> Unit) {
    val text = salon.locationText ?: return
    Row(
        modifier = Modifier
            .padding(top = AppTheme.spacing.space10)
            .clip(AppTheme.shapes.small)
            .clickable(role = Role.Button, enabled = salon.location != null) { onAction(UiAction.OnLocationClick) }
            .padding(AppTheme.spacing.space6),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(SalonDesign.locationGap),
    ) {
        Icon(
            imageVector = AppIcons.Location,
            contentDescription = null,
            tint = AppTheme.colors.accent,
            modifier = Modifier.size(SalonDesign.locationIcon),
        )
        AppText(
            text = text,
            style = AppTheme.typography.labelMedium.copy(textDecoration = TextDecoration.Underline),
            color = AppTheme.colors.accent,
        )
    }
}

/** Loading placeholder of S07: cover, logo circle, two text lines, two buttons, a block, four circles, a tall block. */
@Composable
internal fun SalonShimmer() {
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space20),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(spacing.space12),
    ) {
        AppShimmerBox(Modifier.fillMaxWidth().height(SalonDesign.coverHeight), shape = AppTheme.shapes.extraLarge)
        Box(
            modifier = Modifier
                .offset(y = -SalonDesign.shimmerLogoOverlap)
                .size(SalonDesign.shimmerLogoOuter)
                .background(colors.background, AppTheme.shapes.circle)
                .padding(SalonDesign.logoBorder)
                .background(colors.shimmerBase, AppTheme.shapes.circle),
        )
        Column(
            modifier = Modifier.fillMaxWidth().offset(y = -SalonDesign.shimmerLogoOverlap),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(spacing.space12),
        ) {
            ShimmerLine(SalonDesign.shimmerTitleWidth, SalonDesign.shimmerTitleHeight)
            ShimmerLine(SalonDesign.shimmerSubtitleWidth, SalonDesign.shimmerSubtitleHeight)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
                AppShimmerBox(Modifier.weight(1f).height(SalonDesign.shimmerButtonHeight), shape = AppTheme.shapes.medium)
                AppShimmerBox(Modifier.weight(1f).height(SalonDesign.shimmerButtonHeight), shape = AppTheme.shapes.medium)
            }
            AppShimmerBox(Modifier.fillMaxWidth().height(SalonDesign.shimmerBlockHeight), shape = AppTheme.shapes.medium)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(spacing.space14)) {
                repeat(SalonDesign.SHIMMER_CIRCLES) {
                    AppShimmerBox(Modifier.size(SalonDesign.shimmerCircle), shape = AppTheme.shapes.circle)
                }
                Spacer(Modifier.weight(1f))
            }
            AppShimmerBox(Modifier.fillMaxWidth().height(SalonDesign.shimmerTallHeight), shape = AppTheme.shapes.medium)
        }
    }
}

@Composable
private fun ShimmerLine(width: Dp, height: Dp) {
    AppShimmerBox(Modifier.width(width).height(height), shape = AppTheme.shapes.pill)
}

package com.fab.wab.customer.feature.home.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.designsystem.components.domain.BusinessTypeBadge
import com.fab.wab.customer.designsystem.components.domain.audienceLabel
import com.fab.wab.customer.designsystem.components.domain.hoursLine
import com.fab.wab.customer.designsystem.components.glass.glassBackground
import com.fab.wab.customer.designsystem.components.image.AppImage
import com.fab.wab.customer.designsystem.components.image.AppImageFallback
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.favorite_add
import com.fab.wab.customer.designsystem.resources.favorite_remove
import com.fab.wab.customer.designsystem.resources.salon_closed_now
import com.fab.wab.customer.designsystem.resources.salon_closed_today
import com.fab.wab.customer.designsystem.resources.salon_hours_separator
import com.fab.wab.customer.designsystem.resources.salon_open
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.softShadow
import com.fab.wab.customer.feature.home.presentation.resources.Res as HomeRes
import com.fab.wab.customer.feature.home.presentation.resources.home_distance_km
import org.jetbrains.compose.resources.stringResource

/**
 * Salon card of the Home carousels (design S03 `recSalons` / `nearSalons`): 250 dp wide, 118 dp image with the
 * favorite heart and, when [showDistance], the "x km" pill; body = name + rating, type · audience, location, description + "more",
 * open/closed status line.
 */
@Composable
fun DiscoverySalonCard(
    salon: SalonSummary,
    onClick: () -> Unit,
    onFavoriteClick: () -> Unit,
    modifier: Modifier = Modifier,
    showDistance: Boolean = false,
) {
    val colors = AppTheme.colors
    val shape = RoundedCornerShape(DiscoveryDesign.SALON_CARD_RADIUS)
    Column(
        modifier = modifier
            .width(DiscoveryDesign.SALON_CARD_WIDTH)
            .clip(shape)
            .glassBackground(AppTheme.glass, shape)
            .clickable(role = Role.Button, onClick = onClick),
    ) {
        Box(Modifier.fillMaxWidth().height(DiscoveryDesign.SALON_IMAGE_HEIGHT)) {
            SalonImage(salon.imageUrl, Modifier.fillMaxWidth().height(DiscoveryDesign.SALON_IMAGE_HEIGHT))
            val distance = salon.distanceKm
            if (showDistance && distance != null) {
                DistancePill(distance, Modifier.align(Alignment.BottomStart).padding(AppTheme.spacing.space10))
            }
            FavoriteHeart(
                isFavorite = salon.isFavorite,
                onClick = onFavoriteClick,
                modifier = Modifier.align(Alignment.TopEnd).padding(AppTheme.spacing.space10),
                withBackground = true,
            )
        }
        Column(
            modifier = Modifier.padding(
                start = AppTheme.spacing.space14,
                end = AppTheme.spacing.space14,
                top = AppTheme.spacing.space12,
                bottom = AppTheme.spacing.space14,
            ),
            verticalArrangement = Arrangement.spacedBy(DiscoveryDesign.SALON_BODY_GAP),
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8), verticalAlignment = Alignment.CenterVertically) {
                SalonName(salon.displayName, Modifier.weight(1f))
                DiscoveryRatingLine(salon.rating, salon.reviewsCount, DiscoveryDesign.TEXT_12_5)
            }
            BusinessLine(salon)
            LocationLine(salon.placeText())
            DescriptionLine(salon.shortDescription.orEmpty())
            StatusLine(salon)
        }
    }
}

@Composable
fun SalonImage(url: String?, modifier: Modifier = Modifier) {
    if (url != null) AppImage(url = url, modifier = modifier) else AppImageFallback(modifier)
}

@Composable
internal fun SalonName(name: String, modifier: Modifier = Modifier) {
    AppText(text = name, style = discoveryBody(DiscoveryDesign.TEXT_14_5, FontWeight.Bold), maxLines = 1, modifier = modifier)
}

/** 34 dp white circle with a 17 dp pink heart (filled when favorite); without background it is the 30 dp list variant. */
@Composable
internal fun FavoriteHeart(
    isFavorite: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    withBackground: Boolean = true,
    size: Dp = DiscoveryDesign.FAVORITE_SIZE,
    iconSize: Dp = DiscoveryDesign.FAVORITE_ICON,
) {
    val colors = AppTheme.colors
    val description = stringResource(if (isFavorite) Res.string.favorite_remove else Res.string.favorite_add)
    val background = if (withBackground) {
        Modifier
            .softShadow(
                DiscoveryDesign.FAVORITE_SHADOW,
                colors.shadow.copy(alpha = DiscoveryDesign.FAVORITE_SHADOW_ALPHA),
                AppTheme.shapes.circle,
            )
            .background(colors.onGradient.copy(alpha = DiscoveryDesign.FAVORITE_BG_ALPHA), AppTheme.shapes.circle)
    } else {
        Modifier
    }
    Box(
        modifier = modifier.size(size).then(background).clip(AppTheme.shapes.circle).clickable(role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = if (isFavorite) AppIcons.Favorite else AppIcons.FavoriteBorder,
            contentDescription = description,
            tint = colors.danger,
            modifier = Modifier.size(iconSize),
        )
    }
}

@Composable
internal fun DistancePill(distanceKm: Double, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    AppText(
        text = stringResource(HomeRes.string.home_distance_km, distanceText(distanceKm)),
        style = discoveryBody(DiscoveryDesign.TEXT_11_5, FontWeight.SemiBold),
        color = colors.onMedia,
        maxLines = 1,
        modifier = modifier
            .background(
                colors.scrim.copy(alpha = DiscoveryDesign.DISTANCE_PILL_ALPHA),
                RoundedCornerShape(DiscoveryDesign.DISTANCE_PILL_RADIUS),
            )
            .padding(horizontal = AppTheme.spacing.space10, vertical = AppTheme.spacing.space4),
    )
}

/** The type label in its color ("Salon" violet, "Beauty clinic" teal, "Tattoo studio" amber) + the audience (§5.22). */
@Composable
internal fun BusinessLine(salon: SalonSummary, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        BusinessTypeBadge(salon.businessType)
        salon.audience?.let { audience ->
            AppText(
                text = stringResource(audienceLabel(audience)),
                style = discoveryBody(DiscoveryDesign.TEXT_11_5, FontWeight.SemiBold),
                color = AppTheme.colors.muted,
                maxLines = 1,
            )
        }
    }
}

@Composable
internal fun LocationLine(location: String, modifier: Modifier = Modifier, withPin: Boolean = true) {
    val colors = AppTheme.colors
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (withPin) {
            Icon(AppIcons.Location, contentDescription = null, tint = colors.muted, modifier = Modifier.size(DiscoveryDesign.PIN_ICON))
        }
        AppText(text = location, style = discoveryBody(DiscoveryDesign.TEXT_12), color = colors.muted, maxLines = 1)
    }
}

@Composable
internal fun DescriptionLine(description: String, modifier: Modifier = Modifier) {
    AppText(
        text = descriptionWithMore(description),
        style = discoveryBody(DiscoveryDesign.TEXT_12),
        color = AppTheme.colors.muted,
        maxLines = 1,
        modifier = modifier,
    )
}

/** `● Open · 10:00 AM – 10:00 PM` in success, or `● Closed today` in danger (11.5 sp, 600). */
@Composable
internal fun StatusLine(salon: SalonSummary, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val text = hoursLine(
        isOpen = salon.isOpenNow,
        todayHours = salon.todayHoursText(),
        openLabel = stringResource(Res.string.salon_open),
        closedLabel = stringResource(Res.string.salon_closed_today),
        separator = stringResource(Res.string.salon_hours_separator),
        closedNowLabel = stringResource(Res.string.salon_closed_now),
    )
    val color = if (salon.isOpenNow) colors.success else colors.danger
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(DiscoveryDesign.STATUS_DOT).background(color, AppTheme.shapes.circle))
        AppText(text = text, style = discoveryBody(DiscoveryDesign.TEXT_11_5, FontWeight.SemiBold), color = color, maxLines = 1)
    }
}

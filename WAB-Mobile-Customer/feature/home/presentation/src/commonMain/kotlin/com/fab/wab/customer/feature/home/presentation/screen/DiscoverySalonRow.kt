package com.fab.wab.customer.feature.home.presentation.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.designsystem.components.glass.glassBackground
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.home.presentation.resources.Res
import com.fab.wab.customer.feature.home.presentation.resources.home_distance_km
import org.jetbrains.compose.resources.stringResource

/**
 * Full-width salon row of All Salons (design S04 `listSalons`): 88 dp image at Start, then name + heart,
 * rating · reviews · distance, location, description + "more", status line. 18 dp radius, hairline, soft shadow.
 */
@Composable
fun DiscoverySalonRow(
    salon: SalonSummary,
    onClick: () -> Unit,
    onFavoriteClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val shape = RoundedCornerShape(DiscoveryDesign.ROW_RADIUS)
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .glassBackground(AppTheme.glass, shape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(spacing.space12),
        horizontalArrangement = Arrangement.spacedBy(spacing.space12),
    ) {
        SalonImage(salon.imageUrl, Modifier.size(DiscoveryDesign.ROW_IMAGE).clip(AppTheme.shapes.medium))
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(spacing.space4)) {
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space6), verticalAlignment = Alignment.CenterVertically) {
                SalonName(salon.name, Modifier.weight(1f))
                FavoriteHeart(
                    isFavorite = salon.isFavorite,
                    onClick = onFavoriteClick,
                    withBackground = false,
                    size = DiscoveryDesign.ROW_HEART,
                    iconSize = DiscoveryDesign.ROW_HEART_ICON,
                )
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                DiscoveryRatingLine(salon.rating, salon.reviewsCount, DiscoveryDesign.TEXT_12)
                salon.distanceKm?.let { km ->
                    AppText(
                        text = stringResource(Res.string.home_distance_km, distanceText(km)),
                        style = discoveryBody(DiscoveryDesign.TEXT_12, FontWeight.Medium),
                        color = colors.faint,
                        maxLines = 1,
                        modifier = Modifier.padding(start = spacing.space6),
                    )
                }
            }
            LocationLine(salon.placeText(), withPin = false)
            DescriptionLine(salon.shortDescription.orEmpty())
            StatusLine(salon)
        }
    }
}

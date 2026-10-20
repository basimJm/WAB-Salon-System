package com.fab.wab.customer.feature.favorites.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.designsystem.components.domain.ratingValueText
import com.fab.wab.customer.designsystem.components.image.AppImage
import com.fab.wab.customer.designsystem.components.image.AppImageFallback
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.favorites.presentation.resources.Res
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_closed_today
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_more
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_open
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_remove
import com.fab.wab.customer.feature.favorites.presentation.resources.favorites_reviews
import com.fab.wab.customer.feature.home.presentation.screen.toUi
import org.jetbrains.compose.resources.stringResource

/**
 * S20 card (`padding:12px;border:1px solid var(--line);border-radius:18px`): 88 px image, name + filled heart,
 * star rating with the review count, location, one-line description + "more", open / closed line.
 */
@Composable
internal fun FavoriteSalonCard(salon: SalonSummary, onClick: () -> Unit, onRemove: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = RoundedCornerShape(FavoritesDesign.cardRadius)
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .background(colors.card)
            .border(AppTheme.sizes.hairline, colors.line, shape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(FavoritesDesign.cardPadding),
        horizontalArrangement = Arrangement.spacedBy(FavoritesDesign.cardGap),
    ) {
        SalonImage(salon.imageUrl)
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(FavoritesDesign.cardColumnGap)) {
            NameLine(salon.name, onRemove)
            RatingLine(salon.rating, salon.reviewsCount)
            MetaText(salon.locationText.orEmpty())
            DescriptionLine(salon.shortDescription.orEmpty())
            StatusLine(salon)
        }
    }
}

@Composable
private fun SalonImage(url: String?) {
    val modifier = Modifier.size(FavoritesDesign.cardImage).clip(AppTheme.shapes.medium)
    if (url != null) AppImage(url = url, modifier = modifier) else Box(modifier) { AppImageFallback() }
}

@Composable
private fun NameLine(name: String, onRemove: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(FavoritesDesign.statusGap),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppText(
            text = name,
            style = AppTheme.typography.titleSmall.copy(fontSize = FavoritesDesign.nameSize, fontWeight = FontWeight.Bold),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        Box(
            modifier = Modifier
                .size(FavoritesDesign.heartButton)
                .clip(AppTheme.shapes.circle)
                .clickable(role = Role.Button, onClick = onRemove),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = AppIcons.Favorite,
                contentDescription = stringResource(Res.string.favorites_remove),
                tint = AppTheme.colors.danger,
                modifier = Modifier.size(FavoritesDesign.heartIcon),
            )
        }
    }
}

@Composable
private fun RatingLine(rating: Float, reviews: Int) {
    val colors = AppTheme.colors
    val style = AppTheme.typography.labelMedium.copy(fontSize = FavoritesDesign.ratingSize)
    Row(horizontalArrangement = Arrangement.spacedBy(FavoritesDesign.ratingGap), verticalAlignment = Alignment.CenterVertically) {
        Icon(AppIcons.Star, contentDescription = null, tint = colors.warning, modifier = Modifier.size(FavoritesDesign.starIcon))
        AppText(text = ratingValueText(rating), style = style.copy(fontWeight = FontWeight.Bold), maxLines = 1)
        AppText(
            text = stringResource(Res.string.favorites_reviews, reviews),
            style = style.copy(fontWeight = FontWeight.Medium),
            color = colors.faint,
            maxLines = 1,
        )
    }
}

@Composable
private fun MetaText(text: String, modifier: Modifier = Modifier) {
    AppText(
        text = text,
        style = AppTheme.typography.bodySmall.copy(fontSize = FavoritesDesign.metaSize),
        color = AppTheme.colors.muted,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        modifier = modifier,
    )
}

@Composable
private fun DescriptionLine(description: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4), verticalAlignment = Alignment.CenterVertically) {
        MetaText(description, modifier = Modifier.weight(1f, fill = false))
        AppText(
            text = stringResource(Res.string.favorites_more),
            style = AppTheme.typography.labelMedium.copy(fontSize = FavoritesDesign.metaSize),
            color = AppTheme.colors.accent,
            maxLines = 1,
        )
    }
}

/** `Open · 10:00 AM – 10:00 PM` in green or `Closed today` in pink, each with a 6 px dot in the same colour. */
@Composable
private fun StatusLine(salon: SalonSummary) {
    val hours = salon.toUi().todayHours
    val open = salon.isOpenNow && !hours.isNullOrBlank()
    val color = if (open) AppTheme.colors.success else AppTheme.colors.danger
    val text = if (open) stringResource(Res.string.favorites_open, hours.orEmpty()) else stringResource(Res.string.favorites_closed_today)
    Row(horizontalArrangement = Arrangement.spacedBy(FavoritesDesign.statusGap), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(FavoritesDesign.statusDot).background(color, AppTheme.shapes.circle))
        AppText(
            text = text,
            style = AppTheme.typography.labelSmall.copy(fontSize = FavoritesDesign.statusSize, fontWeight = FontWeight.SemiBold),
            color = color,
            maxLines = 1,
        )
    }
}

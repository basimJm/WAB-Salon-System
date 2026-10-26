package com.fab.wab.customer.designsystem.components.domain

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import com.fab.wab.customer.designsystem.components.badge.AppStatusBadge
import com.fab.wab.customer.designsystem.components.badge.StatusTone
import com.fab.wab.customer.designsystem.components.card.AppCard
import com.fab.wab.customer.designsystem.components.image.AppImage
import com.fab.wab.customer.designsystem.components.rating.AppRatingStars
import com.fab.wab.customer.designsystem.components.text.AppExpandableText
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
import org.jetbrains.compose.resources.stringResource

/** Vertical = full width in lists (S04, S20); Horizontal = fixed width in the home carousels (S03). */
enum class SalonCardLayout { Vertical, Horizontal }

private const val DESCRIPTION_LINES = 2

/**
 * The Salon card used everywhere (PRD 8.0): image, name, rating stars + value, location, truncated description,
 * open/closed + today's hours, favorite heart. Auth gating of the heart stays in the feature ([onFavoriteClick]).
 */
@Composable
fun AppSalonCard(
    salon: SalonCardUi,
    onClick: () -> Unit,
    onFavoriteClick: () -> Unit,
    modifier: Modifier = Modifier,
    layout: SalonCardLayout = SalonCardLayout.Vertical,
) {
    val sizes = AppTheme.sizes
    val spacing = AppTheme.spacing
    val width = if (layout == SalonCardLayout.Horizontal) Modifier.width(sizes.cardCompactWidth) else Modifier.fillMaxWidth()
    AppCard(modifier = modifier.then(width), onClick = onClick, contentPadding = spacing.space0) {
        Column {
            Box {
                SalonImage(salon, Modifier.fillMaxWidth().height(sizes.cardImageHeight))
                FavoriteButton(salon.isFavorite, onFavoriteClick, Modifier.align(Alignment.TopEnd))
            }
            Column(modifier = Modifier.padding(spacing.space12), verticalArrangement = Arrangement.spacedBy(spacing.space6)) {
                AppText(text = salon.name, style = AppTheme.typography.titleMedium, maxLines = 1)
                RatingLine(salon.rating)
                AppText(text = salon.locationText, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted, maxLines = 1)
                if (layout == SalonCardLayout.Vertical) {
                    AppExpandableText(text = salon.description, collapsedLines = DESCRIPTION_LINES)
                }
                OpenStatusLine(isOpen = salon.isOpen, todayHours = salon.todayHours)
            }
        }
    }
}

@Composable
private fun SalonImage(salon: SalonCardUi, modifier: Modifier = Modifier) {
    val url = salon.imageUrl
    if (url != null) {
        AppImage(url = url, modifier = modifier.clip(AppTheme.shapes.medium))
    } else {
        Box(modifier = modifier.clip(AppTheme.shapes.medium), contentAlignment = Alignment.Center) {
            Icon(AppIcons.Home, contentDescription = null, tint = AppTheme.colors.faint)
        }
    }
}

@Composable
private fun FavoriteButton(isFavorite: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val description = stringResource(if (isFavorite) Res.string.favorite_remove else Res.string.favorite_add)
    IconButton(onClick = onClick, modifier = modifier.padding(AppTheme.spacing.space4)) {
        Box(
            modifier = Modifier
                .clip(CircleShape)
                .padding(AppTheme.spacing.space4),
        ) {
            Icon(
                imageVector = if (isFavorite) AppIcons.Favorite else AppIcons.FavoriteBorder,
                contentDescription = description,
                tint = if (isFavorite) AppTheme.colors.danger else AppTheme.colors.onMedia,
            )
        }
    }
}

@Composable
internal fun RatingLine(rating: Float) {
    Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6), verticalAlignment = Alignment.CenterVertically) {
        AppRatingStars(rating = rating)
        AppText(text = ratingValueText(rating), style = AppTheme.typography.labelMedium, color = AppTheme.colors.muted, maxLines = 1)
    }
}

/** "Open · hours" as a success badge, "Closed today" as a neutral badge (PRD 8.0, S07 item 3). */
@Composable
fun OpenStatusLine(isOpen: Boolean, todayHours: String?, modifier: Modifier = Modifier) {
    val text = hoursLine(
        isOpen = isOpen,
        todayHours = todayHours,
        openLabel = stringResource(Res.string.salon_open),
        closedLabel = stringResource(Res.string.salon_closed_today),
        separator = stringResource(Res.string.salon_hours_separator),
        closedNowLabel = stringResource(Res.string.salon_closed_now),
    )
    AppStatusBadge(text = text, tone = if (isOpen) StatusTone.Success else StatusTone.Neutral, modifier = modifier)
}

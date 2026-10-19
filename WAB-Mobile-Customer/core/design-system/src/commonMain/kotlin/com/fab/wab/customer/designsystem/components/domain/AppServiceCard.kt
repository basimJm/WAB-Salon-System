package com.fab.wab.customer.designsystem.components.domain

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import com.fab.wab.customer.designsystem.components.card.AppCard
import com.fab.wab.customer.designsystem.components.image.AppImage
import com.fab.wab.customer.designsystem.components.text.AppExpandableText
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.service_duration_minutes
import com.fab.wab.customer.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.stringResource

private const val COMPACT_DESCRIPTION_LINES = 1
private const val EXPANDABLE_COLLAPSED_LINES = 2

/** Compact service card of the home carousel (S03 item 5): image, name, one-line description. */
@Composable
fun AppServiceCardCompact(service: ServiceCardUi, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val sizes = AppTheme.sizes
    val spacing = AppTheme.spacing
    AppCard(modifier = modifier.width(sizes.cardCompactWidth), onClick = onClick, contentPadding = spacing.space12) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
            ServiceImage(service.imageUrl, Modifier.fillMaxWidth().height(sizes.cardImageHeight))
            AppText(text = service.name, style = AppTheme.typography.titleSmall, maxLines = 1)
            AppText(
                text = service.description,
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colors.muted,
                maxLines = COMPACT_DESCRIPTION_LINES,
            )
        }
    }
}

/**
 * Expandable service card of All Services (S06): tapping "more" expands the description in place,
 * tapping anywhere else opens the salons filtered by this service ([onClick]).
 */
@Composable
fun AppServiceCardExpandable(service: ServiceCardUi, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val sizes = AppTheme.sizes
    val spacing = AppTheme.spacing
    AppCard(modifier = modifier.fillMaxWidth(), onClick = onClick, contentPadding = spacing.space12) {
        Row(horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
            ServiceImage(service.imageUrl, Modifier.size(sizes.listItemImage))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(spacing.space4)) {
                AppText(text = service.name, style = AppTheme.typography.titleSmall, maxLines = 1)
                AppExpandableText(text = service.description, collapsedLines = EXPANDABLE_COLLAPSED_LINES)
            }
        }
    }
}

/** Salon-service row of Salon Details (S07 item 10): image, name, duration and price. */
@Composable
fun AppSalonServiceRow(service: ServiceCardUi, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val sizes = AppTheme.sizes
    val spacing = AppTheme.spacing
    AppCard(modifier = modifier.fillMaxWidth(), onClick = onClick, contentPadding = spacing.space12) {
        Row(horizontalArrangement = Arrangement.spacedBy(spacing.space12), verticalAlignment = Alignment.CenterVertically) {
            ServiceImage(service.imageUrl, Modifier.size(sizes.listItemImage))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(spacing.space4)) {
                AppText(text = service.name, style = AppTheme.typography.titleSmall, maxLines = 1)
                service.durationMinutes?.let { minutes ->
                    AppText(
                        text = stringResource(Res.string.service_duration_minutes, minutes),
                        style = AppTheme.typography.bodySmall,
                        color = AppTheme.colors.muted,
                    )
                }
            }
            service.priceText?.let { price ->
                AppText(text = price, style = AppTheme.typography.titleSmall, color = AppTheme.colors.accent, maxLines = 1)
            }
        }
    }
}

@Composable
private fun ServiceImage(url: String?, modifier: Modifier = Modifier) {
    val shaped = modifier.clip(AppTheme.shapes.small)
    if (url != null) {
        AppImage(url = url, modifier = shaped)
    } else {
        Box(modifier = shaped)
    }
}

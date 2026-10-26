package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.salon.SalonService
import com.fab.wab.customer.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.customer.designsystem.components.image.AppImage
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.price_jod
import com.fab.wab.customer.designsystem.resources.service_duration_minutes
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.salon.presentation.analytics.SalonAnalytics
import org.jetbrains.compose.resources.stringResource

private const val MEDIA_TYPE = "media"

/** S07b: name + accent price, clock + duration, full description and the 110 px media tiles (tap → S10). */
@Composable
fun ServiceSheet(service: SalonService, onMediaClick: (Int) -> Unit, onDismiss: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonAnalytics.SERVICE_SCREEN)
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    AppBottomSheet(onDismiss = onDismiss, modifier = modifier) {
        Column(Modifier.fillMaxWidth().padding(start = spacing.space20, end = spacing.space20, bottom = SalonDesign.modalSheetBottom)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(spacing.space10),
                verticalAlignment = Alignment.Top,
            ) {
                AppText(text = service.name, style = AppTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
                AppText(
                    text = stringResource(CoreRes.string.price_jod, service.price),
                    style = AppTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                    color = colors.accent,
                    maxLines = 1,
                )
            }
            Row(
                modifier = Modifier.padding(top = spacing.space6, bottom = spacing.space14),
                horizontalArrangement = Arrangement.spacedBy(spacing.space6),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = SalonIcons.Clock,
                    contentDescription = null,
                    tint = colors.muted,
                    modifier = Modifier.size(SalonDesign.serviceDurationIcon),
                )
                AppText(
                    text = stringResource(CoreRes.string.service_duration_minutes, service.durationMinutes),
                    style = AppTheme.typography.bodySmall,
                    color = colors.muted,
                )
                if (service.brideOnly) BrideOnlyLabel()
            }
            service.description?.let {
                AppText(
                    text = it,
                    style = AppTheme.typography.bodyMedium,
                    color = colors.muted,
                    modifier = Modifier.padding(bottom = spacing.space16),
                )
            }
            if (service.mediaUrls.isNotEmpty()) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(spacing.space8)) {
                    itemsIndexed(service.mediaUrls, key = { _, url -> url }, contentType = { _, _ -> MEDIA_TYPE }) { index, url ->
                        Box(
                            modifier = Modifier
                                .size(SalonDesign.serviceMediaTile)
                                .clip(AppTheme.shapes.medium)
                                .clickable(role = Role.Button) { onMediaClick(index) },
                        ) {
                            AppImage(url = url, modifier = Modifier.fillMaxSize())
                        }
                    }
                }
            }
        }
    }
}

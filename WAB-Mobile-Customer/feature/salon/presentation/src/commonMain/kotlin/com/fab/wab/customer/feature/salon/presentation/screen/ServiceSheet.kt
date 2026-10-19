package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.core.domain.salon.SalonService
import com.fab.wab.customer.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.customer.designsystem.components.media.AppMediaTile
import com.fab.wab.customer.designsystem.components.media.MediaItemUi
import com.fab.wab.customer.designsystem.components.media.MediaKind
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.price_jod
import com.fab.wab.customer.designsystem.resources.service_duration_minutes
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.service_media
import org.jetbrains.compose.resources.stringResource

/** S07b: name, full description, duration, price and the salon's media for the service (tap → S10, CUS-039). */
@Composable
fun ServiceSheet(service: SalonService, onMediaClick: (Int) -> Unit, onDismiss: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonAnalytics.SERVICE_SCREEN)
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = onDismiss, modifier = modifier) {
        Column(modifier = Modifier.fillMaxWidth().padding(spacing.space16), verticalArrangement = Arrangement.spacedBy(spacing.space12)) {
            AppText(text = service.name, style = AppTheme.typography.headlineSmall)
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
                AppText(
                    text = stringResource(CoreRes.string.service_duration_minutes, service.durationMinutes),
                    color = AppTheme.colors.muted,
                )
                AppText(text = stringResource(CoreRes.string.price_jod, service.price), style = AppTheme.typography.titleSmall)
            }
            service.description?.let { AppText(text = it) }
            if (service.mediaUrls.isNotEmpty()) {
                AppText(text = stringResource(Res.string.service_media), style = AppTheme.typography.titleSmall)
                LazyRow(contentPadding = PaddingValues(0.dp), horizontalArrangement = Arrangement.spacedBy(spacing.space8)) {
                    itemsIndexed(service.mediaUrls, key = { _, url -> url }, contentType = { _, _ -> MEDIA_TYPE }) { index, url ->
                        AppMediaTile(
                            item = MediaItemUi(id = url, url = url, kind = MediaKind.Image),
                            onClick = { onMediaClick(index) },
                            modifier = Modifier.size(AppTheme.sizes.listItemImage * MEDIA_TILE_SCALE),
                        )
                    }
                }
            }
        }
    }
}

private const val MEDIA_TILE_SCALE = 2
private const val MEDIA_TYPE = "media"

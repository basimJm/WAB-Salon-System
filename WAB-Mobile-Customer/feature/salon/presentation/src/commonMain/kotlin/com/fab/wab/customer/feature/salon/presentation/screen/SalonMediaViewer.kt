package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.fab.wab.customer.designsystem.components.button.AppIconButton
import com.fab.wab.customer.designsystem.components.image.AppImage
import com.fab.wab.customer.designsystem.components.media.AppVideoPlayer
import com.fab.wab.customer.designsystem.components.media.MediaItemUi
import com.fab.wab.customer.designsystem.components.media.MediaKind
import com.fab.wab.customer.designsystem.components.media.MediaViewerDefaults
import com.fab.wab.customer.designsystem.components.media.clampZoom
import com.fab.wab.customer.designsystem.components.media.panOffsetFor
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.common_close
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.media_counter
import com.fab.wab.customer.feature.salon.presentation.resources.media_zoom_hint
import org.jetbrains.compose.resources.stringResource

/**
 * S10 as drawn in 03 Salon: black backdrop, circular close at Start, `n / total` counter centered (always LTR),
 * swipe between items, pinch-to-zoom images with the zoom hint, platform player for videos.
 */
@Composable
fun SalonMediaViewer(items: List<MediaItemUi>, startIndex: Int, onClose: () -> Unit, modifier: Modifier = Modifier) {
    if (items.isEmpty()) return
    val pagerState = rememberPagerState(initialPage = startIndex.coerceIn(0, items.lastIndex), pageCount = { items.size })
    val colors = AppTheme.colors
    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(dismissOnBackPress = true, dismissOnClickOutside = false, usePlatformDefaultWidth = false),
    ) {
        Column(modifier = modifier.fillMaxSize().background(colors.shadow).windowInsetsPadding(WindowInsets.statusBars)) {
            ViewerTopBar(position = pagerState.currentPage + 1, count = items.size, onClose = onClose)
            HorizontalPager(state = pagerState, modifier = Modifier.weight(1f).fillMaxWidth(), key = { items[it].id }) { page ->
                val item = items[page]
                if (item.kind == MediaKind.Video) {
                    AppVideoPlayer(url = item.url, modifier = Modifier.fillMaxSize())
                } else {
                    ZoomableImage(url = item.url)
                }
            }
            if (items[pagerState.currentPage].kind == MediaKind.Image) {
                AppText(
                    text = stringResource(Res.string.media_zoom_hint),
                    style = AppTheme.typography.bodySmall,
                    color = colors.onMedia.copy(alpha = SalonDesign.MEDIA_HINT_ALPHA),
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = AppTheme.spacing.space14, start = AppTheme.spacing.space20, end = AppTheme.spacing.space20)
                        .padding(bottom = SalonDesign.mediaHintBottom),
                )
            }
        }
    }
}

@Composable
private fun ViewerTopBar(position: Int, count: Int, onClose: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    Row(
        modifier = modifier.fillMaxWidth().height(AppTheme.sizes.topBarHeight).padding(horizontal = AppTheme.spacing.space12),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        AppIconButton(
            icon = AppIcons.Close,
            contentDescription = stringResource(CoreRes.string.common_close),
            onClick = onClose,
            modifier = Modifier.background(colors.onMedia.copy(alpha = SalonDesign.MEDIA_CLOSE_ALPHA), AppTheme.shapes.circle),
            tint = colors.onMedia,
            size = SalonDesign.mediaCloseButton,
        )
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
            AppText(
                text = stringResource(Res.string.media_counter, position, count),
                style = AppTheme.typography.titleSmall,
                color = colors.onMedia,
            )
        }
        Spacer(Modifier.width(SalonDesign.mediaCloseButton))
    }
}

/** Pinch-to-zoom image page: scale is clamped, panning only while zoomed so the pager keeps its swipes at 1x. */
@Composable
private fun ZoomableImage(url: String, modifier: Modifier = Modifier) {
    var scale by remember { mutableFloatStateOf(MediaViewerDefaults.MIN_ZOOM) }
    var offsetX by remember { mutableFloatStateOf(0f) }
    var offsetY by remember { mutableFloatStateOf(0f) }
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        AppImage(
            url = url,
            contentScale = ContentScale.Fit,
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(url) {
                    detectTransformGestures { _, pan, zoom, _ ->
                        scale = clampZoom(scale * zoom)
                        offsetX = panOffsetFor(scale, offsetX, pan.x)
                        offsetY = panOffsetFor(scale, offsetY, pan.y)
                    }
                }
                .graphicsLayer {
                    scaleX = scale
                    scaleY = scale
                    translationX = offsetX
                    translationY = offsetY
                },
        )
    }
}

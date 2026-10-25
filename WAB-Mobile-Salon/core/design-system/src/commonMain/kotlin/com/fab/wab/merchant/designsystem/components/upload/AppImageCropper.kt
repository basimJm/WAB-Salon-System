package com.fab.wab.merchant.designsystem.components.upload

import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.IntSize
import coil3.compose.AsyncImage
import com.fab.wab.merchant.core.ui.media.CropRegion
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.image.LocalImageLoader
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.upload_cancel
import com.fab.wab.merchant.designsystem.resources.upload_crop_title
import com.fab.wab.merchant.designsystem.resources.upload_use_image
import com.fab.wab.merchant.designsystem.resources.upload_zoom
import com.fab.wab.merchant.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.stringResource

private const val CANCEL_WEIGHT = 1f
private const val CONFIRM_WEIGHT = 2f
private const val THIRD = 1f / 3f
private const val TWO_THIRDS = 2f / 3f
private const val HALF = 0.5f

/**
 * Crop sheet body (design 05 Salon `sh.crop`): the picked image under a [CropAspect] frame with a rule-of-thirds grid,
 * drag to move, pinch or the slider to zoom, Cancel / Use image. [onConfirm] gets the normalized region for
 * `ImageCropper`.
 */
@Composable
fun AppImageCropper(
    bytes: ByteArray,
    aspect: CropAspect,
    onConfirm: (CropRegion) -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var crop by remember(bytes) { mutableStateOf(CropState()) }
    var imageAspect by remember(bytes) { mutableFloatStateOf(aspect.ratio) }
    val spacing = AppTheme.spacing
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(spacing.space14)) {
        AppText(text = stringResource(Res.string.upload_crop_title), style = AppTheme.typography.titleMedium)
        CropFrame(
            bytes = bytes,
            aspect = aspect,
            crop = crop,
            imageAspect = imageAspect,
            onImageAspect = { imageAspect = it },
            onCrop = { crop = it },
        )
        ZoomSlider(zoom = crop.zoom, onZoom = { crop = crop.zoomTo(it, imageAspect, aspect.ratio) })
        Row(horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
            AppButton(stringResource(Res.string.upload_cancel), onCancel, Modifier.weight(CANCEL_WEIGHT), kind = ButtonKind.Outlined)
            AppButton(
                text = stringResource(Res.string.upload_use_image),
                onClick = { onConfirm(crop.region(imageAspect, aspect.ratio)) },
                modifier = Modifier.weight(CONFIRM_WEIGHT),
            )
        }
    }
}

@Composable
private fun CropFrame(
    bytes: ByteArray,
    aspect: CropAspect,
    crop: CropState,
    imageAspect: Float,
    onImageAspect: (Float) -> Unit,
    onCrop: (CropState) -> Unit,
) {
    var frame by remember { mutableStateOf(IntSize.Zero) }
    val currentCrop by rememberUpdatedState(crop)
    val currentOnCrop by rememberUpdatedState(onCrop)
    val gridColor = AppTheme.colors.onMedia.copy(alpha = AppTheme.alpha.gridLine)
    val line = AppTheme.sizes.hairline
    val region = crop.region(imageAspect, aspect.ratio)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(aspect.ratio)
            .clip(AppTheme.shapes.medium)
            .onSizeChanged { frame = it }
            .pointerInput(imageAspect, aspect) {
                detectTransformGestures { _, pan, zoom, _ ->
                    if (frame.width == 0 || frame.height == 0) return@detectTransformGestures
                    val zoomed = currentCrop.zoomTo(currentCrop.zoom * zoom, imageAspect, aspect.ratio)
                    currentOnCrop(zoomed.pan(pan.x / frame.width, pan.y / frame.height, imageAspect, aspect.ratio))
                }
            }
            .drawWithContent {
                drawContent()
                val stroke = line.toPx()
                listOf(THIRD, TWO_THIRDS).forEach { f ->
                    drawLine(gridColor, Offset(size.width * f, 0f), Offset(size.width * f, size.height), stroke)
                    drawLine(gridColor, Offset(0f, size.height * f), Offset(size.width, size.height * f), stroke)
                }
            },
    ) {
        AsyncImage(
            model = bytes,
            contentDescription = null,
            imageLoader = LocalImageLoader.current,
            contentScale = ContentScale.Crop,
            onSuccess = { state ->
                val size = state.painter.intrinsicSize
                if (size.width > 0f && size.height > 0f) onImageAspect(size.width / size.height)
            },
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer {
                    scaleX = crop.zoom
                    scaleY = crop.zoom
                    translationX = (HALF - crop.centerX) * size.width / region.width
                    translationY = (HALF - crop.centerY) * size.height / region.height
                },
        )
    }
}

@Composable
private fun ZoomSlider(zoom: Float, onZoom: (Float) -> Unit) {
    val colors = AppTheme.colors
    val label = stringResource(Res.string.upload_zoom)
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space10)) {
        Icon(AppIcons.Remove, contentDescription = null, tint = colors.muted, modifier = Modifier.size(AppTheme.sizes.iconSmall))
        Slider(
            value = zoom,
            onValueChange = onZoom,
            valueRange = 1f..CropState.MAX_ZOOM,
            modifier = Modifier.weight(1f).semantics { contentDescription = label },
            colors = SliderDefaults.colors(
                thumbColor = colors.card,
                activeTrackColor = colors.gradientEnd,
                inactiveTrackColor = colors.line,
            ),
        )
        Icon(AppIcons.Add, contentDescription = null, tint = colors.muted, modifier = Modifier.size(AppTheme.sizes.iconSmall))
    }
}

package com.fab.wab.customer.feature.salons.presentation.screen

import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import com.fab.wab.customer.designsystem.theme.AppTheme
import kotlin.math.abs

/**
 * Design S05 price range: 40 dp strip, 4 dp line track with a gradient fill between two 22 dp white thumbs
 * (3 dp violet border, soft glow). A press moves the nearest thumb; whole-JOD values; mirrored in RTL.
 */
@Composable
internal fun FilterPriceSlider(
    selection: ClosedFloatingPointRange<Float>,
    bounds: ClosedFloatingPointRange<Float>,
    onSelectionChange: (ClosedFloatingPointRange<Float>) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.colors
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
    val currentSelection by rememberUpdatedState(selection)
    val currentOnChange by rememberUpdatedState(onSelectionChange)
    var activeThumb by remember { mutableStateOf<PriceThumb?>(null) }
    val thumbRadius = AppTheme.sizes.sliderThumb / HALF
    val fill = Brush.horizontalGradient(listOf(colors.gradientStart, colors.gradientEnd))
    val line = colors.line
    val thumbFill = colors.card
    val thumbBorder = colors.gradientEnd
    val glow = colors.accent.copy(alpha = SalonsDesign.SLIDER_THUMB_SHADOW_ALPHA)

    fun press(x: Float, width: Float) {
        val value = priceAtFraction(trackFraction(x, width, rtl), bounds)
        val thumb = activeThumb ?: nearestThumb(value, currentSelection).also { activeThumb = it }
        currentOnChange(movedSelection(thumb, value, currentSelection))
    }
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = SalonsDesign.SLIDER_MARGIN_H)
            .height(SalonsDesign.SLIDER_HEIGHT)
            .pointerInput(bounds, rtl) {
                detectTapGestures(
                    onPress = { offset ->
                        activeThumb = null
                        press(offset.x, size.width.toFloat())
                    },
                )
            }
            .pointerInput(bounds, rtl) {
                detectDragGestures(
                    onDragStart = { activeThumb = null },
                    onDragEnd = { activeThumb = null },
                    onDragCancel = { activeThumb = null },
                ) { change, _ ->
                    change.consume()
                    press(change.position.x, size.width.toFloat())
                }
            }
            .drawBehind {
                val start = fractionX(priceFraction(selection.start, bounds), rtl)
                val end = fractionX(priceFraction(selection.endInclusive, bounds), rtl)
                val trackTop = SalonsDesign.SLIDER_TRACK_TOP.toPx()
                val trackHeight = SalonsDesign.SLIDER_TRACK.toPx()
                val radius = CornerRadius(trackHeight / HALF)
                drawRoundRect(line, Offset(0f, trackTop), Size(size.width, trackHeight), radius)
                drawRoundRect(fill, Offset(minOf(start, end), trackTop), Size(abs(end - start), trackHeight), radius)
                drawThumb(start, trackTop + trackHeight / HALF, thumbRadius.toPx(), thumbFill, thumbBorder, glow)
                drawThumb(end, trackTop + trackHeight / HALF, thumbRadius.toPx(), thumbFill, thumbBorder, glow)
            },
    )
}

private fun DrawScope.fractionX(fraction: Float, rtl: Boolean): Float = (if (rtl) 1f - fraction else fraction) * size.width

private fun DrawScope.drawThumb(
    x: Float,
    y: Float,
    radius: Float,
    fill: Color,
    border: Color,
    glow: Color,
) {
    val center = Offset(x, y)
    drawCircle(glow, radius + SalonsDesign.SLIDER_THUMB_SHADOW.toPx(), center)
    drawCircle(fill, radius, center)
    drawCircle(
        border,
        radius - SalonsDesign.SLIDER_THUMB_BORDER.toPx() / HALF,
        center,
        style = Stroke(SalonsDesign.SLIDER_THUMB_BORDER.toPx()),
    )
}

private const val HALF = 2

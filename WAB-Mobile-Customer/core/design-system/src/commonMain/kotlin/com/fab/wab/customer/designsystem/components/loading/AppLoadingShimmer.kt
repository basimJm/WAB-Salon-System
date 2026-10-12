package com.fab.wab.customer.designsystem.components.loading

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.theme.LocalAppColors

@Composable
fun AppLoadingShimmer(
    modifier: Modifier = Modifier,
    height: Int = 16,
    cornerRadius: Int = 8,
) {
    val colors = LocalAppColors.current
    val isDark = colors.background.luminance() < 0.5f
    val baseColor = if (isDark) Color.White else Color.Black
    
    val shimmerColors = listOf(
        baseColor.copy(alpha = if (isDark) 0.05f else 0.03f),
        baseColor.copy(alpha = if (isDark) 0.12f else 0.08f),
        baseColor.copy(alpha = if (isDark) 0.05f else 0.03f),
    )

    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnim by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = 1200,
                easing = FastOutSlowInEasing,
            ),
            repeatMode = RepeatMode.Restart,
        ),
        label = "shimmerTranslate",
    )

    val brush = Brush.linearGradient(
        colors = shimmerColors,
        start = Offset(translateAnim - 500, translateAnim - 500),
        end = Offset(translateAnim, translateAnim),
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height.dp)
            .clip(RoundedCornerShape(cornerRadius.dp))
            .background(brush),
    )
}

@Composable
fun AppShimmerTicket(
    modifier: Modifier = Modifier,
    height: Dp = 180.dp,
) {
    val colors = LocalAppColors.current
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .clip(TicketShape(circleRadius = 10.dp, cornerRadius = 24.dp))
            .background(colors.surfaceContainerLow)
            .padding(24.dp)
    ) {
        Column(verticalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxSize()) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                AppLoadingShimmer(modifier = Modifier.width(100.dp), height = 12)
                AppLoadingShimmer(modifier = Modifier.fillMaxWidth(0.7f), height = 24)
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    AppLoadingShimmer(modifier = Modifier.width(60.dp), height = 10)
                    AppLoadingShimmer(modifier = Modifier.width(80.dp), height = 16)
                }
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    horizontalAlignment = Alignment.End
                ) {
                    AppLoadingShimmer(modifier = Modifier.width(60.dp), height = 10)
                    AppLoadingShimmer(modifier = Modifier.width(80.dp), height = 16)
                }
            }
        }

        Canvas(modifier = Modifier.fillMaxSize()) {
            val isDark = colors.background.luminance() < 0.5f
            val dashColor = if (isDark) Color.White.copy(alpha = 0.1f) else Color.Black.copy(alpha = 0.1f)
            val pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f)
            drawLine(
                color = dashColor,
                start = Offset(24.dp.toPx(), size.height / 2),
                end = Offset(size.width - 24.dp.toPx(), size.height / 2),
                strokeWidth = 1.dp.toPx(),
                pathEffect = pathEffect
            )
        }
    }
}

@Composable
fun AppShimmerCompactCard(
    modifier: Modifier = Modifier,
) {
    val colors = LocalAppColors.current
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(colors.surfaceContainerLow)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        AppLoadingShimmer(
            modifier = Modifier.size(48.dp),
            height = 48,
            cornerRadius = 12,
        )

        Column(
            modifier = Modifier
                .padding(horizontal = 16.dp)
                .weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            AppLoadingShimmer(modifier = Modifier.width(140.dp), height = 12)
            AppLoadingShimmer(modifier = Modifier.width(90.dp), height = 10)
        }

        AppLoadingShimmer(
            modifier = Modifier.width(44.dp),
            height = 24,
            cornerRadius = 8,
        )
    }
}

@Composable
fun AppTicketScreenShimmer(
    modifier: Modifier = Modifier,
) {
    val colors = LocalAppColors.current
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        AppShimmerTicket()

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            AppLoadingShimmer(modifier = Modifier.width(140.dp), height = 14)
            AppLoadingShimmer(modifier = Modifier.width(220.dp), height = 10)
        }

        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            repeat(4) {
                AppShimmerCompactCard()
            }
        }
    }
}

private class TicketShape(
    private val circleRadius: Dp,
    private val cornerRadius: Dp
) : Shape {
    override fun createOutline(
        size: Size,
        layoutDirection: LayoutDirection,
        density: Density
    ): Outline {
        val radius = with(density) { circleRadius.toPx() }
        val rectRadius = with(density) { cornerRadius.toPx() }

        val path = Path().apply {
            moveTo(rectRadius, 0f)
            lineTo(size.width - rectRadius, 0f)
            arcTo(
                rect = Rect(size.width - 2 * rectRadius, 0f, size.width, 2 * rectRadius),
                startAngleDegrees = 270f,
                sweepAngleDegrees = 90f,
                forceMoveTo = false
            )

            lineTo(size.width, size.height / 2 - radius)
            arcTo(
                rect = Rect(
                    size.width - radius,
                    size.height / 2 - radius,
                    size.width + radius,
                    size.height / 2 + radius
                ),
                startAngleDegrees = 270f,
                sweepAngleDegrees = -180f,
                forceMoveTo = false
            )

            lineTo(size.width, size.height - rectRadius)
            arcTo(
                rect = Rect(
                    size.width - 2 * rectRadius,
                    size.height - 2 * rectRadius,
                    size.width,
                    size.height
                ),
                startAngleDegrees = 0f,
                sweepAngleDegrees = 90f,
                forceMoveTo = false
            )

            lineTo(rectRadius, size.height)
            arcTo(
                rect = Rect(0f, size.height - 2 * rectRadius, 2 * rectRadius, size.height),
                startAngleDegrees = 90f,
                sweepAngleDegrees = 90f,
                forceMoveTo = false
            )

            lineTo(0f, size.height / 2 + radius)
            arcTo(
                rect = Rect(-radius, size.height / 2 - radius, radius, size.height / 2 + radius),
                startAngleDegrees = 90f,
                sweepAngleDegrees = -180f,
                forceMoveTo = false
            )

            lineTo(0f, rectRadius)
            arcTo(
                rect = Rect(0f, 0f, 2 * rectRadius, 2 * rectRadius),
                startAngleDegrees = 180f,
                sweepAngleDegrees = 90f,
                forceMoveTo = false
            )
            close()
        }

        return Outline.Generic(path)
    }
}

@Preview
@Composable
private fun AppTicketScreenShimmerPreview() {
    AppTheme {
        AppTicketScreenShimmer()
    }
}

package com.fab.wab.customer.designsystem.utils

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.core.ui.utils.LocalDarkTheme
import com.fab.wab.customer.designsystem.theme.LocalSpacing

val PrimaryGradientBrush = Brush.horizontalGradient(
    colors = listOf(
        Color(0xFF4EDEA3),
        Color(0xFF10B981)
    )
)

val PrimaryGradientDisabledBrush = Brush.horizontalGradient(
    colors = listOf(
        Color(0xFF4EDEA3).copy(alpha = 0.5f),
        Color(0xFF10B981).copy(alpha = 0.5f)
    )
)


@Composable
fun Modifier.primaryGradientBackground(
    enabled: Boolean = true,
    shape: Shape = RoundedCornerShape(16.dp)
): Modifier = this
    .shadow(
        elevation = if (enabled) 10.dp else 0.dp,
        shape = shape,
        ambientColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.4f),
        spotColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.4f),
    )
    .clip(shape)
    .background(
        if (enabled) PrimaryGradientBrush
        else PrimaryGradientDisabledBrush
    )

@Stable
@Composable
fun Modifier.mirror(): Modifier {
    return if (LocalLayoutDirection.current == LayoutDirection.Rtl) {
        this.scale(scaleX = -1f, scaleY = 1f)
    } else this
}

@Composable
fun createGlassGradient(isDark: Boolean): Brush {
    val primaryContainer = MaterialTheme.colorScheme.primaryContainer
    return if (isDark) {
        Brush.linearGradient(
            colors = listOf(
                Color.White.copy(alpha = 0.15f),
                Color.White.copy(alpha = 0.05f),
                Color.White.copy(alpha = 0.10f)
            ),
            start = Offset.Zero,
            end = Offset.Infinite
        )
    } else {
        Brush.linearGradient(
            colors = listOf(
                Color.White.copy(alpha = 0.85f),
                Color.White.copy(alpha = 0.15f),
                Color.White.copy(alpha = 0.5f)
            ),
            start = Offset.Zero,
            end = Offset.Infinite
        )
    }
}

@Composable
fun createGlassBorderGradient(isDark: Boolean): Brush {
    val primary = MaterialTheme.colorScheme.primary
    return if (isDark) {
        Brush.linearGradient(
            0.2f to primary.copy(alpha = 0.1f),
            0.4f to primary.copy(alpha = 0.1f),
            start = Offset.Zero,
            end = Offset.Infinite
        )
    } else {
        // Light mode: Sharp 100% white highlights for the "shining" effect
        Brush.linearGradient(
            0.2f to primary.copy(alpha = 0.1f),
            0.2f to primary.copy(alpha = 0.1f),
            start = Offset.Zero,
            end = Offset.Infinite
        )
    }
}

@Composable
fun Modifier.glassEffect(
    blurRadius: androidx.compose.ui.unit.Dp? = null,
    cornerRadius: androidx.compose.ui.unit.Dp? = null
): Modifier {
    val isDark = LocalDarkTheme.current
    val spacing = LocalSpacing.current

    val actualBlur = blurRadius ?: spacing.space12
    val actualCorner = cornerRadius ?: spacing.space16
    val primaryColor = MaterialTheme.colorScheme.primary

    return this
        .then(
            if (!isDark) {
                Modifier.drawBehind {
                    drawRoundRect(
                        color = primaryColor.copy(alpha = 0.08f),
                        topLeft = Offset(0f, 4f),
                        size = size,
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(actualCorner.toPx()),
                    )
                }
            } else Modifier
        )
        .blur(radius = actualBlur)
        .background(
            brush = createGlassGradient(isDark),
            shape = RoundedCornerShape(actualCorner)
        )
        .border(
            width = 1.dp,
            brush = createGlassBorderGradient(isDark),
            shape = RoundedCornerShape(actualCorner)
        )
        .clip(RoundedCornerShape(actualCorner))
}

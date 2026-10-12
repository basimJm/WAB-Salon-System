package com.fab.wab.customer.designsystem.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Shape tokens following Stitch "ROUND_EIGHT" specification.
 * Base unit: 4dp
 *   extraSmall  = 1×  = 4dp
 *   small       = 2×  = 8dp   ← Stitch ROUND_EIGHT default
 *   medium      = 3×  = 12dp
 *   large       = 4×  = 16dp
 *   extraLarge  = 6×  = 24dp
 *   full        = pill shape (50%)
 *
 * Source: https://stitch.withgoogle.com/projects/5464419906246487732
 */
data class ShapeTokens(
    val none: Shape,
    val extraSmall: Shape,
    val small: Shape,
    val medium: Shape,
    val large: Shape,
    val extraLarge: Shape,
    val full: Shape,
)

/** ROUND_EIGHT — the Stitch design system default (8dp base) */
val DefaultShapeTokens = ShapeTokens(
    none = RoundedCornerShape(0.dp),
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(24.dp),
    full = RoundedCornerShape(50),
)

fun ShapeTokens.toCustomSizes(
    none: Dp = 0.dp,
    extraSmall: Dp = 4.dp,
    small: Dp = 8.dp,
    medium: Dp = 12.dp,
    large: Dp = 16.dp,
    extraLarge: Dp = 24.dp,
): ShapeTokens = ShapeTokens(
    none = RoundedCornerShape(none),
    extraSmall = RoundedCornerShape(extraSmall),
    small = RoundedCornerShape(small),
    medium = RoundedCornerShape(medium),
    large = RoundedCornerShape(large),
    extraLarge = RoundedCornerShape(extraLarge),
    full = RoundedCornerShape(50),
)

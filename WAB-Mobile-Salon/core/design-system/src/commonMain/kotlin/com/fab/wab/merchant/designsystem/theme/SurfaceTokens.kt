package com.fab.wab.merchant.designsystem.theme

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp

/** Fill of a flat surface, as the design names it: `var(--card)`, `var(--surface)` or `var(--soft)`. */
enum class SurfaceTone { Card, Surface, Soft }

/**
 * The design's flat surfaces (owner decision 2026-10-26: no Liquid Glass): cards, fields, rows, chips and bars are a
 * solid `--card` / `--surface` / `--soft` fill with a `1px solid var(--line)` edge; error, focus and selection draw
 * a 1.5 dp state border instead of the line. Built from the theme colours, so light and dark follow.
 */
@Immutable
data class SurfaceTokens(
    val card: Color,
    val surface: Color,
    val soft: Color,
    val line: Color,
    val lineWidth: Dp,
    val stateBorderWidth: Dp,
) {
    fun fill(tone: SurfaceTone): Color = when (tone) {
        SurfaceTone.Card -> card
        SurfaceTone.Surface -> surface
        SurfaceTone.Soft -> soft
    }
}

fun surfaceTokensFor(colors: AppColors, sizes: SizeTokens = DefaultSizes): SurfaceTokens = SurfaceTokens(
    card = colors.card,
    surface = colors.surface,
    soft = colors.soft,
    line = colors.line,
    lineWidth = sizes.hairline,
    stateBorderWidth = sizes.borderWidth,
)

val DefaultSurfaces: SurfaceTokens = surfaceTokensFor(LightColors)

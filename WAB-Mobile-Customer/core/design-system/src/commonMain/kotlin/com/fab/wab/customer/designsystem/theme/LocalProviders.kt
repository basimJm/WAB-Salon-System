package com.fab.wab.customer.designsystem.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

val LocalAppColors = compositionLocalOf { LightColorTokens }
val LocalSpacing = compositionLocalOf { DefaultSpacingTokens }
val LocalShapes = compositionLocalOf { DefaultShapeTokens }

// LocalTypography is provided via ProvideDesignSystemTokens (not compositionLocalOf default)
// because TypographyTokens needs @Composable Font() calls for bundled fonts.
val LocalTypography = compositionLocalOf {
    // Fallback using system fonts — valid until ProvideDesignSystemTokens overrides it
    SystemTypographyTokens
}

// ─────────────────────────────────────────────────────────────────
// Component Radii — updated to ROUND_EIGHT design spec
// Source: https://stitch.withgoogle.com/projects/5464419906246487732
// ─────────────────────────────────────────────────────────────────

/** Card corner radius — ROUND_EIGHT medium (16dp) */
val RadiusCard = 16.dp

/** Button corner radius — ROUND_EIGHT small (12dp) */
val RadiusButton = 12.dp

/** Premium card border — emerald tint (replaces old blue tint) */
val PremiumCardBorderColor = Color(0x1A10B981)

/**
 * Provides design system tokens to the composition.
 *
 * Typography is passed as a [TypographyTokens] instance (built via
 * [DarkTypographyTokens] or [LightTypographyTokens] in AppTheme's
 * @Composable scope, enabling Font(resource = ...) calls).
 *
 * @param colors the AppColors palette (dark or light)
 * @param spacing the SpacingTokens scale
 * @param shapes the ShapeTokens with ROUND_EIGHT values
 * @param typography the TypographyTokens with bundled font families
 * @param content app content
 */
@Composable
fun ProvideDesignSystemTokens(
    colors: AppColors = LightColorTokens,
    spacing: SpacingTokens = DefaultSpacingTokens,
    shapes: ShapeTokens = DefaultShapeTokens,
    typography: TypographyTokens = SystemTypographyTokens,
    content: @Composable () -> Unit,
) {
    CompositionLocalProvider(
        LocalAppColors provides colors,
        LocalSpacing provides spacing,
        LocalShapes provides shapes,
        LocalTypography provides typography,
        content = content,
    )
}

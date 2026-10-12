package com.fab.wab.customer.designsystem.theme

import androidx.compose.ui.graphics.Color

fun String.toComposeColor(): Color {
    val hex = this.removePrefix("#")
    return when (hex.length) {
        6 -> Color(hex.toLong(16) or 0x00000000FF000000L)
        8 -> Color(hex.toLong(16))
        else -> Color.Transparent
    }
}


/**
 * Full color palette from Stitch "Remix of WABCustomer" design system.
 * Dark theme: "WABCustomer Design System" (bright emerald #4edea3 on deep dark #0e1511)
 * Light theme: "Emerald Alchemist Light" (deep emerald #006c49 on mint #f0fdf4)
 *
 * Source: https://stitch.withgoogle.com/projects/5464419906246487732
 *
 * Design strategy: "The Digital Curator" (dark) / "The Botanical Atelier" (light)
 * - No-line philosophy: boundaries via tonal shifts, not borders
 * - Surface container hierarchy (8 tonal levels)
 * - Glassmorphism: rgba(255,255,255,0.05) + 12px blur for floating elements
 * - Ambient shadows: colored glows using primary/emerald tint
 */
data class AppColors(
    // ── Primary ────────────────────────────────────────────────
    val primary: Color,
    val onPrimary: Color,
    val primaryContainer: Color,
    val onPrimaryContainer: Color,

    // ── Primary Fixed (Stitch extended palette for text/placeholders) ─
    val primaryFixed: Color,
    val primaryFixedDim: Color,

    // ── Secondary ──────────────────────────────────────────────
    val secondary: Color,
    val onSecondary: Color,
    val secondaryContainer: Color,
    val onSecondaryContainer: Color,

    // ── Tertiary ───────────────────────────────────────────────
    val tertiary: Color,
    val onTertiary: Color,
    val tertiaryContainer: Color,
    val onTertiaryContainer: Color,

    // ── Surface (base) ─────────────────────────────────────────
    val background: Color,
    val onBackground: Color,
    val surface: Color,
    val onSurface: Color,
    val surfaceVariant: Color,
    val onSurfaceVariant: Color,

    // ── Surface containers (Stitch extended palette) ────────────
    val surfaceBright: Color,
    val surfaceDim: Color,
    val surfaceContainerLowest: Color,
    val surfaceContainerLow: Color,
    val surfaceContainer: Color,
    val surfaceContainerHigh: Color,
    val surfaceContainerHighest: Color,
    val surfaceTint: Color,

    // ── Outline ────────────────────────────────────────────────
    val outline: Color,
    val outlineVariant: Color,

    // ── Error ─────────────────────────────────────────────────
    val error: Color,
    val onError: Color,
    val errorContainer: Color,
    val onErrorContainer: Color,

    // ── Semantic: Success ──────────────────────────────────────
    val success: Color,
    val onSuccess: Color,
    val successContainer: Color,
    val onSuccessContainer: Color,

    // ── Semantic: Warning ─────────────────────────────────────
    val warning: Color,
    val onWarning: Color,
    val warningContainer: Color,
    val onWarningContainer: Color,

    // ── Semantic: Info ─────────────────────────────────────────
    val info: Color,
    val onInfo: Color,
    val infoContainer: Color,
    val onInfoContainer: Color,

    // ── Disabled ──────────────────────────────────────────────
    val disabled: Color,
    val disabledContent: Color,

    // ── Inverse / special ──────────────────────────────────────
    val inverseSurface: Color,
    val inverseOnSurface: Color,
    val inversePrimary: Color,
    val scrim: Color,

    // ── Accent (Coral from Stitch design for titles/highlights) ─
    val accent: Color,
)

// ─────────────────────────────────────────────────────────────────
// DARK THEME — "WABCustomer Design System"
// colorMode: DARK | customColor: #10b981 | primary: #4edea3
// Headline font: EPILOGUE | Body font: INTER | Roundness: ROUND_EIGHT
// ─────────────────────────────────────────────────────────────────
val DarkColorTokens = AppColors(
    // Primary — bright emerald on deep dark
    primary = Color(0xFF4EDEA3),
    onPrimary = Color(0xFF003824),
    primaryContainer = Color(0xFF10B981),
    onPrimaryContainer = Color(0xFF00422B),

    // Primary Fixed — bright mint for text, dim for icons/placeholders
    primaryFixed = Color(0xFF6FFBBE),
    primaryFixedDim = Color(0xFF4EDEA3),

    // Secondary — muted sage green
    secondary = Color(0xFF9ED2B5),
    onSecondary = Color(0xFF013824),
    secondaryContainer = Color(0xFF21523C),
    onSecondaryContainer = Color(0xFF91C4A8),

    // Tertiary — soft coral (for accents)
    tertiary = Color(0xFFFFB3AF),
    onTertiary = Color(0xFF650911),
    tertiaryContainer = Color(0xFFFC7C78),
    onTertiaryContainer = Color(0xFF711419),

    // Surface (base)
    background = Color(0xFF002113),
    onBackground = Color(0xFFDDE4DD),
    surface = Color(0xFF0E1511),
    onSurface = Color(0xFFDDE4DD),
    surfaceVariant = Color(0xFF2F3632),
    onSurfaceVariant = Color(0xFFBBCABF),

    // Surface containers (8-level tonal hierarchy)
    surfaceBright = Color(0xFF343B36),
    surfaceDim = Color(0xFF0E1511),
    surfaceContainerLowest = Color(0xFF09100C),
    surfaceContainerLow = Color(0xFF161D19),
    surfaceContainer = Color(0xFF1A211D),
    surfaceContainerHigh = Color(0xFF242C27),
    surfaceContainerHighest = Color(0xFF2F3632),
    surfaceTint = Color(0xFF4EDEA3),

    // Outline
    outline = Color(0xFF86948A),
    outlineVariant = Color(0xFF3C4A42),

    // Error
    error = Color(0xFFBA1A1A),
    onError = Color(0xFFFFDAD6),
    errorContainer = Color(0xFF93000A),
    onErrorContainer = Color(0xFFFFDAD6),

    // Success — emerald-toned to match the palette
    success = Color(0xFF4EDEA3),
    onSuccess = Color(0xFF003824),
    successContainer = Color(0xFF00422B),
    onSuccessContainer = Color(0xFF002113),

    // Warning
    warning = Color(0xFFFBBF24),
    onWarning = Color(0xFF78350F),
    warningContainer = Color(0xFF92400E),
    onWarningContainer = Color(0xFFFEF3C7),

    // Info
    info = Color(0xFF60A5FA),
    onInfo = Color(0xFF1E3A8A),
    infoContainer = Color(0xFF1E40AF),
    onInfoContainer = Color(0xFFDBEAFE),

    // Disabled
    disabled = Color(0xFF3C4A42),
    disabledContent = Color(0xFF64748B),

    // Inverse / special
    inverseSurface = Color(0xFFDDE4DD),
    inverseOnSurface = Color(0xFF2B322D),
    inversePrimary = Color(0xFF4EDEA3),
    scrim = Color(0xFF000000),

    // Accent (Coral from Stitch design for titles/highlights)
    accent = Color(0xFFFC7C78),
)

// ─────────────────────────────────────────────────────────────────
// LIGHT THEME — "Emerald Alchemist Light"
// colorMode: LIGHT | customColor: #10b981 | primary: #006c49
// Headline font: MANROPE | Body font: PLUS_JAKARTA_SANS | Roundness: ROUND_EIGHT
// ─────────────────────────────────────────────────────────────────
val LightColorTokens = AppColors(
    // Primary — deep emerald on mint white
    primary = Color(0xFF006C49),
    onPrimary = Color(0xFF003824),
    primaryContainer = Color(0xFF10B981),
    onPrimaryContainer = Color(0xFF00422B),

    // Primary Fixed — bright mint for text on dark, dim on light
    primaryFixed = Color(0xFF4EDEA3),
    primaryFixedDim = Color(0xFF006C49),

    // Secondary — forest sage
    secondary = Color(0xFF2B6954),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFADEDD3),
    onSecondaryContainer = Color(0xFF306D58),

    // Tertiary — warm coral
    tertiary = Color(0xFFA43A3A),
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFFC7C78),
    onTertiaryContainer = Color(0xFF711419),

    // Surface (base)
    background = Color(0xFFF0FDF4),
    onBackground = Color(0xFF131E19),
    surface = Color(0xFFF0FDF4),
    onSurface = Color(0xFF131E19),
    surfaceVariant = Color(0xFFD9E6DD),
    onSurfaceVariant = Color(0xFF3C4A42),

    // Surface containers (8-level tonal hierarchy)
    surfaceBright = Color(0xFFF0FDF4),
    surfaceDim = Color(0xFFD0DDD5),
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color(0xFFEAF7EE),
    surfaceContainer = Color(0xFFE4F1E8),
    surfaceContainerHigh = Color(0xFFDEEBE3),
    surfaceContainerHighest = Color(0xFFD9E6DD),
    surfaceTint = Color(0xFF006C49),

    // Outline
    outline = Color(0xFF6C7A71),
    outlineVariant = Color(0xFFBBCABF),

    // Error
    error = Color(0xFFBA1A1A),
    onError = Color(0xFFFFDAD6),
    errorContainer = Color(0xFFFFDAD6),
    onErrorContainer = Color(0xFF93000A),

    // Success — deep emerald for contrast on light bg
    success = Color(0xFF006C49),
    onSuccess = Color(0xFFFFDAD6),
    successContainer = Color(0xFFBAEED1),
    onSuccessContainer = Color(0xFF002113),

    // Warning
    warning = Color(0xFFF59E0B),
    onWarning = Color(0xFFFFDAD6),
    warningContainer = Color(0xFFFEF3C7),
    onWarningContainer = Color(0xFF92400E),

    // Info
    info = Color(0xFF3B82F6),
    onInfo = Color(0xFFFFDAD6),
    infoContainer = Color(0xFFEFF6FF),
    onInfoContainer = Color(0xFF1E40AF),

    // Disabled
    disabled = Color(0xFFE2E8F0),
    disabledContent = Color(0xFF94A3B8),

    // Inverse / special
    inverseSurface = Color(0xFF27332D),
    inverseOnSurface = Color(0xFFE7F4EB),
    inversePrimary = Color(0xFF4EDEA3),
    scrim = Color(0xFF000000),

    // Accent (Coral from Stitch design for titles/highlights)
    accent = Color(0xFFFC7C78),
)

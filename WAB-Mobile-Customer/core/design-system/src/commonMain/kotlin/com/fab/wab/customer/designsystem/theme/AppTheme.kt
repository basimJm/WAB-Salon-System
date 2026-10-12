package com.fab.wab.customer.designsystem.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.ui.utils.LocalDarkTheme

/**
 * Full Material3 ColorScheme including surface container tokens.
 * Material3 ColorScheme only exposes surface + surfaceVariant at the scheme level,
 * so the extended 8-level container palette is available via LocalAppColors.
 */
private fun AppColors.toMaterial3LightScheme() = lightColorScheme(
    primary = primary,
    onPrimary = onPrimary,
    primaryContainer = primaryContainer,
    onPrimaryContainer = onPrimaryContainer,
    secondary = secondary,
    onSecondary = onSecondary,
    secondaryContainer = secondaryContainer,
    onSecondaryContainer = onSecondaryContainer,
    tertiary = tertiary,
    onTertiary = onTertiary,
    tertiaryContainer = tertiaryContainer,
    onTertiaryContainer = onTertiaryContainer,
    background = background,
    onBackground = onBackground,
    surface = surface,
    onSurface = onSurface,
    surfaceVariant = surfaceVariant,
    onSurfaceVariant = onSurfaceVariant,
    error = error,
    onError = onError,
    errorContainer = errorContainer,
    onErrorContainer = onErrorContainer,
    outline = outline,
    outlineVariant = outlineVariant,
    scrim = scrim,
    inverseSurface = inverseSurface,
    inverseOnSurface = inverseOnSurface,
    inversePrimary = inversePrimary,
)

private fun AppColors.toMaterial3DarkScheme() = darkColorScheme(
    primary = primary,
    onPrimary = onPrimary,
    primaryContainer = primaryContainer,
    onPrimaryContainer = onPrimaryContainer,
    secondary = secondary,
    onSecondary = onSecondary,
    secondaryContainer = secondaryContainer,
    onSecondaryContainer = onSecondaryContainer,
    tertiary = tertiary,
    onTertiary = onTertiary,
    tertiaryContainer = tertiaryContainer,
    onTertiaryContainer = onTertiaryContainer,
    background = background,
    onBackground = onBackground,
    surface = surface,
    onSurface = onSurface,
    surfaceVariant = surfaceVariant,
    onSurfaceVariant = onSurfaceVariant,
    error = error,
    onError = onError,
    errorContainer = errorContainer,
    onErrorContainer = onErrorContainer,
    outline = outline,
    outlineVariant = outlineVariant,
    scrim = scrim,
    inverseSurface = inverseSurface,
    inverseOnSurface = inverseOnSurface,
    inversePrimary = inversePrimary,
)

/**
 * AppTheme — Emerald Alchemist design system theme.
 *
 * Provides two distinct visual identities:
 * - Dark: "WABCustomer" — bright emerald #4edea3 on deep forest #0e1511
 *         Fonts: Epilogue (headlines) + Inter (body)
 * - Light: "Emerald Alchemist" — deep emerald #006c49 on mint #f0fdf4
 *         Fonts: Manrope (headlines) + Plus Jakarta Sans (body)
 *
 * The extended 8-level surface container palette is accessible via
 * [LocalAppColors] for components that need fine-grained tonal control.
 * Typography tokens are built inside this @Composable scope so that Font(resource = ...)
 * composable calls can load the bundled woff2 font files.
 *
 * @param darkTheme selects between dark and light visual identities
 * @param dynamicColor ignored (Stitch design system takes precedence)
 * @param content app content
 *
 * Source: https://stitch.withgoogle.com/projects/5464419906246487732
 */
@Composable
fun AppTheme(
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit,
) {
    val darkTheme = LocalDarkTheme.current

    val colorTokens = if (darkTheme) DarkColorTokens else LightColorTokens
    val colorScheme = if (darkTheme) {
        colorTokens.toMaterial3DarkScheme()
    } else {
        colorTokens.toMaterial3LightScheme()
    }
    // Build typography inside @Composable scope so Font(resource = ...) composable calls work
    val typographyTokens = if (darkTheme) {
        DarkTypographyTokens()
    } else {
        LightTypographyTokens()
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = typographyTokens.toMaterial3Typography(),

        ) {
        ProvideDesignSystemTokens(
            colors = colorTokens,
            spacing = DefaultSpacingTokens,
            typography = typographyTokens,
            shapes = DefaultShapeTokens,
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(colorTokens.background),
            ) {
                content()
            }
        }
    }
}

package com.fab.wab.customer.designsystem.theme

import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.sp

// ─────────────────────────────────────────────────────────────────
// Typography Tokens Data Class
// ─────────────────────────────────────────────────────────────────

data class TypographyTokens(
    val headlineLarge: TextStyle,
    val headlineMedium: TextStyle,
    val headlineSmall: TextStyle,
    val titleLarge: TextStyle,
    val titleMedium: TextStyle,
    val titleSmall: TextStyle,
    val bodyLarge: TextStyle,
    val bodyMedium: TextStyle,
    val bodySmall: TextStyle,
    val labelLarge: TextStyle,
    val labelMedium: TextStyle,
    val labelSmall: TextStyle,
    val sectionLabel: TextStyle,
)

fun TypographyTokens.toMaterial3Typography(): Typography = Typography(
    headlineLarge = headlineLarge,
    headlineMedium = headlineMedium,
    headlineSmall = headlineSmall,
    titleLarge = titleLarge,
    titleMedium = titleMedium,
    titleSmall = titleSmall,
    bodyLarge = bodyLarge,
    bodyMedium = bodyMedium,
    bodySmall = bodySmall,
    labelLarge = labelLarge,
    labelMedium = labelMedium,
    labelSmall = labelSmall,
)

/** System-font fallback — used when ProvideDesignSystemTokens is not in scope */
val SystemTypographyTokens = TypographyTokens(
    headlineLarge = TextStyle(
        fontWeight = FontWeight.Black,
        fontSize = 32.sp,
        lineHeight = 40.sp,
        letterSpacing = (-0.25).sp,
        textDirection = TextDirection.Content
    ),
    headlineMedium = TextStyle(
        fontWeight = FontWeight.Black,
        fontSize = 28.sp,
        lineHeight = 36.sp,
        letterSpacing = 0.sp,
        textDirection = TextDirection.Content
    ),
    headlineSmall = TextStyle(
        fontWeight = FontWeight.Black,
        fontSize = 24.sp,
        lineHeight = 32.sp,
        letterSpacing = 0.sp,
        textDirection = TextDirection.Content
    ),
    titleLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 22.sp,
        lineHeight = 28.sp,
        letterSpacing = 0.sp,
        textDirection = TextDirection.Content
    ),
    titleMedium = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.15.sp,
        textDirection = TextDirection.Content
    ),
    titleSmall = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp,
        textDirection = TextDirection.Content
    ),
    bodyLarge = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.5.sp,
        textDirection = TextDirection.Content
    ),
    bodyMedium = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.25.sp,
        textDirection = TextDirection.Content
    ),
    bodySmall = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.4.sp,
        textDirection = TextDirection.Content
    ),
    labelLarge = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp,
        textDirection = TextDirection.Content
    ),
    labelMedium = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.5.sp,
        textDirection = TextDirection.Content
    ),
    labelSmall = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 10.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.5.sp,
        textDirection = TextDirection.Content
    ),
    sectionLabel = TextStyle(
        fontWeight = FontWeight.Black,
        fontSize = 10.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.2.sp,
        textDirection = TextDirection.Content
    ),
)

/** Backwards compatibility alias */
val DefaultTypographyTokens = SystemTypographyTokens

// ─────────────────────────────────────────────────────────────────
// Dark & Light Typography Builders
// NOTE: Font(resource = ...) is not available in CMP 1.10.0 on commonMain.
// Custom fonts are loaded via expect/actual in androidMain/iosMain.
// Until the expect/actual is implemented, these use FontFamily.SansSerif.
// Follow-up: implement AppFonts.kt (expect) + AppFonts.android.kt / AppFonts.ios.kt (actual)
// Font files are in: src/commonMain/resources/fonts/*.woff2
// ─────────────────────────────────────────────────────────────────

/** Dark theme typography — Epilogue headlines + Inter body */
@Composable
fun DarkTypographyTokens(
    headlineFamily: FontFamily = FontFamily.SansSerif,
    bodyFamily: FontFamily = FontFamily.SansSerif,
): TypographyTokens = remember(headlineFamily, bodyFamily) {
    TypographyTokens(
        headlineLarge = TextStyle(
            fontFamily = headlineFamily,
            fontWeight = FontWeight.Black,
            fontSize = 32.sp,
            lineHeight = 40.sp,
            letterSpacing = (-0.25).sp,
            textDirection = TextDirection.Content
        ),
        headlineMedium = TextStyle(
            fontFamily = headlineFamily,
            fontWeight = FontWeight.Black,
            fontSize = 28.sp,
            lineHeight = 36.sp,
            letterSpacing = 0.sp,
            textDirection = TextDirection.Content
        ),
        headlineSmall = TextStyle(
            fontFamily = headlineFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 24.sp,
            lineHeight = 32.sp,
            letterSpacing = 0.sp,
            textDirection = TextDirection.Content
        ),
        titleLarge = TextStyle(
            fontFamily = headlineFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 22.sp,
            lineHeight = 28.sp,
            letterSpacing = 0.sp,
            textDirection = TextDirection.Content
        ),
        titleMedium = TextStyle(
            fontFamily = bodyFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            lineHeight = 24.sp,
            letterSpacing = 0.15.sp,
            textDirection = TextDirection.Content
        ),
        titleSmall = TextStyle(
            fontFamily = bodyFamily,
            fontWeight = FontWeight.SemiBold,
            fontSize = 14.sp,
            lineHeight = 20.sp,
            letterSpacing = 0.1.sp,
            textDirection = TextDirection.Content
        ),
        bodyLarge = TextStyle(
            fontFamily = bodyFamily,
            fontWeight = FontWeight.Normal,
            fontSize = 16.sp,
            lineHeight = 24.sp,
            letterSpacing = 0.5.sp,
            textDirection = TextDirection.Content
        ),
        bodyMedium = TextStyle(
            fontFamily = bodyFamily,
            fontWeight = FontWeight.Medium,
            fontSize = 14.sp,
            lineHeight = 20.sp,
            letterSpacing = 0.25.sp,
            textDirection = TextDirection.Content
        ),
        bodySmall = TextStyle(
            fontFamily = bodyFamily,
            fontWeight = FontWeight.Normal,
            fontSize = 12.sp,
            lineHeight = 16.sp,
            letterSpacing = 0.4.sp,
            textDirection = TextDirection.Content
        ),
        labelLarge = TextStyle(
            fontFamily = bodyFamily,
            fontWeight = FontWeight.Medium,
            fontSize = 14.sp,
            lineHeight = 20.sp,
            letterSpacing = 0.1.sp,
            textDirection = TextDirection.Content
        ),
        labelMedium = TextStyle(
            fontFamily = bodyFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 12.sp,
            lineHeight = 16.sp,
            letterSpacing = 0.5.sp,
            textDirection = TextDirection.Content
        ),
        labelSmall = TextStyle(
            fontFamily = bodyFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 10.sp,
            lineHeight = 16.sp,
            letterSpacing = 0.5.sp,
            textDirection = TextDirection.Content
        ),
        sectionLabel = TextStyle(
            fontFamily = bodyFamily,
            fontWeight = FontWeight.Black,
            fontSize = 10.sp,
            lineHeight = 16.sp,
            letterSpacing = 0.2.sp,
            textDirection = TextDirection.Content
        ),
    )
}

/** Light theme typography — Manrope headlines + Plus Jakarta Sans body */
@Composable
fun LightTypographyTokens(
    headlineFamily: FontFamily = FontFamily.SansSerif,
    bodyFamily: FontFamily = FontFamily.SansSerif,
): TypographyTokens = remember(headlineFamily, bodyFamily) {
    TypographyTokens(
        headlineLarge = TextStyle(
            fontFamily = headlineFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 32.sp,
            lineHeight = 40.sp,
            letterSpacing = (-0.25).sp,
            textDirection = TextDirection.Content
        ),
        headlineMedium = TextStyle(
            fontFamily = headlineFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 28.sp,
            lineHeight = 36.sp,
            letterSpacing = 0.sp, textDirection = TextDirection.Content
        ),
        headlineSmall = TextStyle(
            fontFamily = headlineFamily,
            fontWeight = FontWeight.SemiBold,
            fontSize = 24.sp,
            lineHeight = 32.sp,
            letterSpacing = 0.sp,
            textDirection = TextDirection.Content
        ),
        titleLarge = TextStyle(
            fontFamily = headlineFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 22.sp,
            lineHeight = 28.sp,
            letterSpacing = 0.sp,
            textDirection = TextDirection.Content
        ),
        titleMedium = TextStyle(
            fontFamily = bodyFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            lineHeight = 24.sp,
            letterSpacing = 0.15.sp, textDirection = TextDirection.Content
        ),
        titleSmall = TextStyle(
            fontFamily = bodyFamily,
            fontWeight = FontWeight.SemiBold,
            fontSize = 14.sp,
            lineHeight = 20.sp,
            letterSpacing = 0.1.sp,
            textDirection = TextDirection.Content
        ),
        bodyLarge = TextStyle(
            fontFamily = bodyFamily,
            fontWeight = FontWeight.Normal,
            fontSize = 16.sp,
            lineHeight = 24.sp,
            letterSpacing = 0.5.sp,
            textDirection = TextDirection.Content
        ),
        bodyMedium = TextStyle(
            fontFamily = bodyFamily,
            fontWeight = FontWeight.Medium,
            fontSize = 14.sp,
            lineHeight = 20.sp,
            letterSpacing = 0.25.sp,
            textDirection = TextDirection.Content
        ),
        bodySmall = TextStyle(
            fontFamily = bodyFamily,
            fontWeight = FontWeight.Normal,
            fontSize = 12.sp,
            lineHeight = 16.sp,
            letterSpacing = 0.4.sp,
            textDirection = TextDirection.Content
        ),
        labelLarge = TextStyle(
            fontFamily = bodyFamily,
            fontWeight = FontWeight.Medium,
            fontSize = 14.sp,
            lineHeight = 20.sp,
            letterSpacing = 0.1.sp,
            textDirection = TextDirection.Content
        ),
        labelMedium = TextStyle(
            fontFamily = bodyFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 12.sp,
            lineHeight = 16.sp,
            letterSpacing = 0.5.sp,
            textDirection = TextDirection.Content
        ),
        labelSmall = TextStyle(
            fontFamily = bodyFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 10.sp,
            lineHeight = 16.sp,
            letterSpacing = 0.5.sp,
            textDirection = TextDirection.Content
        ),
        sectionLabel = TextStyle(
            fontFamily = bodyFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 10.sp,
            lineHeight = 16.sp,
            letterSpacing = 0.2.sp,
            textDirection = TextDirection.Content
        ),
    )
}

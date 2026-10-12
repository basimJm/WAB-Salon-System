package com.fab.wab.customer.designsystem.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalWindowInfo
import androidx.compose.ui.unit.dp

/**
 * Breakpoints follow Material 3 adaptive layout guidance.
 *
 * Compact  < 600dp  — phone portrait (bottom bar)
 * Medium   600–839dp — phone landscape / small tablet (navigation rail)
 * Expanded ≥ 840dp  — large tablet / iPad landscape (navigation rail + content max-width)
 */
enum class AppWindowWidthClass { Compact, Medium, Expanded }

val LocalWindowWidthClass = staticCompositionLocalOf { AppWindowWidthClass.Compact }

@Composable
fun rememberWindowWidthClass(): AppWindowWidthClass {
    val windowInfo = LocalWindowInfo.current
    val density = LocalDensity.current
    val widthDp = with(density) { windowInfo.containerSize.width.toDp() }
    return when {
        widthDp < 600.dp -> AppWindowWidthClass.Compact
        widthDp < 840.dp -> AppWindowWidthClass.Medium
        else -> AppWindowWidthClass.Expanded
    }
}

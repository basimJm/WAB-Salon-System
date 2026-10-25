package com.fab.wab.merchant.core.ui.theme

import androidx.compose.runtime.Composable

/**
 * Status / navigation bar icons follow the app theme (light icons on the dark theme), not the system setting: the
 * member can pick dark mode in More while the phone stays light.
 */
@Composable
expect fun SystemBarsAppearance(darkTheme: Boolean)

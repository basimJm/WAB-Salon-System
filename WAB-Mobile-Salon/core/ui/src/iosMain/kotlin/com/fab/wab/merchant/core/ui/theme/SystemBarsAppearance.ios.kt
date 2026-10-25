package com.fab.wab.merchant.core.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import platform.UIKit.UIApplication
import platform.UIKit.UIUserInterfaceStyle
import platform.UIKit.UIWindow
import platform.UIKit.UIWindowScene

@Composable
actual fun SystemBarsAppearance(darkTheme: Boolean) {
    SideEffect {
        val style = if (darkTheme) UIUserInterfaceStyle.UIUserInterfaceStyleDark else UIUserInterfaceStyle.UIUserInterfaceStyleLight
        // The window style drives the status bar text colour (and system sheets) on iOS.
        UIApplication.sharedApplication.connectedScenes
            .filterIsInstance<UIWindowScene>()
            .flatMap { scene -> scene.windows.filterIsInstance<UIWindow>() }
            .forEach { window -> window.overrideUserInterfaceStyle = style }
    }
}

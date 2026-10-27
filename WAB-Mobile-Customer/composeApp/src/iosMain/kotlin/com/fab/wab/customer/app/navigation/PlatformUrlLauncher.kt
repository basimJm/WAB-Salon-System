package com.fab.wab.customer.app.navigation

import com.fab.wab.customer.core.ui.external.IosSystem

/**
 * iOS implementation of URL launcher.
 */
actual class PlatformUrlLauncher actual constructor() : UrlLauncher {
    override fun openUrl(url: String) = IosSystem.launch(url)
}

package com.fab.wab.customer.app.navigation

import platform.Foundation.NSURL
import platform.UIKit.UIApplication

/**
 * iOS implementation of URL launcher.
 */
actual class PlatformUrlLauncher actual constructor() : UrlLauncher {
    override fun openUrl(url: String) {
        val nsUrl = NSURL.URLWithString(url) ?: return
        UIApplication.sharedApplication.openURL(nsUrl)
    }
}

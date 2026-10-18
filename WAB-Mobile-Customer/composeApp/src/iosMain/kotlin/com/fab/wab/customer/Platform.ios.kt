package com.fab.wab.customer

import platform.Foundation.NSURL
import platform.UIKit.UIApplication
import platform.UIKit.UIDevice
import platform.posix.exit

class IOSPlatform : Platform {
    override val name: String =
        UIDevice.currentDevice.systemName() + " " + UIDevice.currentDevice.systemVersion
    override val analyticsName: String = PlatformNames.IOS
}

actual fun getPlatform(): Platform = IOSPlatform()

// TODO: replace it with real link
actual fun openStoreLink() {
    val url = "https://apps.apple.com/us/app/facebook/id284882215"
    val nsUrl = NSURL.URLWithString(url)
    if (nsUrl != null) {
        UIApplication.sharedApplication.openURL(nsUrl)
    }
}


actual fun exitApp() {
    exit(0)
}

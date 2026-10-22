package com.fab.wab.customer

import platform.Foundation.NSURL
import platform.UIKit.UIApplication
import platform.UIKit.UIDevice
import platform.posix.exit

class IOSPlatform : Platform {
    override val name: String =
        UIDevice.currentDevice.systemName() + " " + UIDevice.currentDevice.systemVersion
    override val analyticsName: String = PlatformNames.IOS
    override val osVersion: String = UIDevice.currentDevice.systemVersion
    override val deviceModel: String = UIDevice.currentDevice.model
}

actual fun getPlatform(): Platform = IOSPlatform()

actual fun openStoreLink(url: String?) {
    val target = url?.takeIf { it.isNotBlank() } ?: return
    val nsUrl = NSURL.URLWithString(target) ?: return
    UIApplication.sharedApplication.openURL(nsUrl)
}

actual fun exitApp() {
    exit(0)
}

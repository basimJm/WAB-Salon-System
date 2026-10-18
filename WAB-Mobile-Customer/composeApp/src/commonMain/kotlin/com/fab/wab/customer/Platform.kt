package com.fab.wab.customer

interface Platform {
    val name: String

    /** Stable lowercase id for analytics (`android` / `ios`), never the human-readable [name]. */
    val analyticsName: String
}

object PlatformNames {
    const val ANDROID = "android"
    const val IOS = "ios"
}

expect fun getPlatform(): Platform

expect fun openStoreLink()

expect fun exitApp()

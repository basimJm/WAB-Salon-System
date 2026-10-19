package com.fab.wab.customer

interface Platform {
    val name: String

    /** Stable lowercase id for analytics (`android` / `ios`), never the human-readable [name]. */
    val analyticsName: String

    /** OS version and device model as the installation record reports them (PRD §14 installations). */
    val osVersion: String
    val deviceModel: String
}

object PlatformNames {
    const val ANDROID = "android"
    const val IOS = "ios"
}

expect fun getPlatform(): Platform

/** Opens the store page the backend configured (S24); a missing URL is a no-op. */
expect fun openStoreLink(url: String?)

expect fun exitApp()

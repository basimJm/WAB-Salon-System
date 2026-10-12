package com.fab.wab.customer.core.common

class AndroidInfoProvider : AppInfoProvider {
    override val appVersion: String get() = "1.0.0"
    override val appVersionCode: Int get() = 1
    override val buildType: String get() = "debug"
}

actual fun getAppInfoProvider(): AppInfoProvider = AndroidInfoProvider()

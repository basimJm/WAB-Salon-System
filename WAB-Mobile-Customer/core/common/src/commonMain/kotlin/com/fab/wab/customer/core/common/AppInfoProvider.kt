package com.fab.wab.customer.core.common

interface AppInfoProvider {
    val appVersion: String
    val appVersionCode: Int
    val buildType: String
}

expect fun getAppInfoProvider(): AppInfoProvider

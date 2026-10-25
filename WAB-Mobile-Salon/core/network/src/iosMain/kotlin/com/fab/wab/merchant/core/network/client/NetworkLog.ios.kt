package com.fab.wab.merchant.core.network.client

import platform.Foundation.NSLog

private const val NETWORK_LOG_FORMAT = "Network: %s"

internal actual fun networkLog(message: String) {
    NSLog(NETWORK_LOG_FORMAT, message)
}

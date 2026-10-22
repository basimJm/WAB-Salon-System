package com.fab.wab.merchant.core.common

import platform.Foundation.NSUUID

actual fun randomUUID(): String = NSUUID().UUIDString()

package com.fab.wab.customer.core.common

import platform.Foundation.NSUUID

actual fun randomUUID(): String = NSUUID().UUIDString()

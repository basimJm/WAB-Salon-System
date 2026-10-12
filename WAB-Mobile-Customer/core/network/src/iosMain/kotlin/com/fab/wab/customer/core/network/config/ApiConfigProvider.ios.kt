package com.fab.wab.customer.core.network.config

import kotlin.experimental.ExperimentalNativeApi
import kotlin.native.Platform

actual fun getApiBaseUrl(): String = "https://api.template.app"
actual fun getAuthToken(): String? = null

@OptIn(ExperimentalNativeApi::class)
actual fun isDebugBuild(): Boolean = Platform.isDebugBinary

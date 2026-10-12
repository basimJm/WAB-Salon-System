package com.fab.wab.customer.core.network.config

actual fun getApiBaseUrl(): String = ApiConstants.BASE_URL
actual fun getAuthToken(): String? = null
actual fun isDebugBuild(): Boolean = runCatching {
    Class.forName("com.fab.wab.customer.BuildConfig")
        .getField("DEBUG")
        .getBoolean(null)
}.getOrDefault(false)

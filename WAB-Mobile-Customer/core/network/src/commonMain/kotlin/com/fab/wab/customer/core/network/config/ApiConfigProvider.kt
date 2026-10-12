package com.fab.wab.customer.core.network.config

expect fun getApiBaseUrl(): String
expect fun getAuthToken(): String?
expect fun isDebugBuild(): Boolean

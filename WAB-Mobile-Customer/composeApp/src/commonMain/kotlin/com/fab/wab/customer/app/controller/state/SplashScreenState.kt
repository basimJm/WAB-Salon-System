package com.fab.wab.customer.app.controller.state

data class SplashScreenState(
    val showSplashScreen: Boolean = true,
    val showUpdateDialog: Boolean = false,
    val showOptionalUpdateDialog: Boolean = false,
    val showMaintenanceDialog: Boolean = false,
    val splashErrorMsg: String? = null,
    val appVersion: String? = null
)

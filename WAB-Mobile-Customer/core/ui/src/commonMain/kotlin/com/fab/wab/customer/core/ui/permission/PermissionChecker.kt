package com.fab.wab.customer.core.ui.permission

expect fun isNotificationPermissionGranted(): Boolean
expect fun requestNotificationPermissionOnHomeLanding()
expect fun openAppSettings()

expect fun isLocationPermissionGranted(): Boolean
expect fun openLocationSettings()

expect fun isGPSEnabled(): Boolean
expect fun openGPSSettings()

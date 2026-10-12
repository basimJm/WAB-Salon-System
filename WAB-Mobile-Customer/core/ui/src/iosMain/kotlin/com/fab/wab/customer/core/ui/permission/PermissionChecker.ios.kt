package com.fab.wab.customer.core.ui.permission

import kotlinx.cinterop.ExperimentalForeignApi
import platform.Foundation.NSURL
import platform.UIKit.UIApplication
import platform.CoreLocation.CLLocationManager

actual fun isNotificationPermissionGranted(): Boolean = true

actual fun requestNotificationPermissionOnHomeLanding() = Unit

@OptIn(ExperimentalForeignApi::class)
actual fun openAppSettings() {
    UIApplication.sharedApplication.openURL(NSURL(string = "app-settings:"))
}

@OptIn(ExperimentalForeignApi::class)
actual fun isLocationPermissionGranted(): Boolean {
    val manager = CLLocationManager()
    return manager.authorizationStatus == 3 || manager.authorizationStatus == 4
}

@OptIn(ExperimentalForeignApi::class)
actual fun openLocationSettings() {
    UIApplication.sharedApplication.openURL(NSURL(string = "app-settings:"))
}

@OptIn(ExperimentalForeignApi::class)
actual fun isGPSEnabled(): Boolean {
    // On iOS, if location services are enabled and we have permission,
    // we can access location. The user doesn't need to separately enable GPS.
    val manager = CLLocationManager()
    val locationServicesEnabled = CLLocationManager.locationServicesEnabled()
    val hasAuthorization = manager.authorizationStatus == 3 || manager.authorizationStatus == 4
    return locationServicesEnabled && hasAuthorization
}

@OptIn(ExperimentalForeignApi::class)
actual fun openGPSSettings() {
    // On iOS, open app settings where user can enable location permission
    // System-level GPS settings require manual navigation by user
    UIApplication.sharedApplication.openURL(NSURL(string = "app-settings:"))
}

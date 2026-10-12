package com.fab.wab.customer.core.ui.permission

import kotlinx.cinterop.ExperimentalForeignApi
import platform.AVFoundation.AVAuthorizationStatusAuthorized
import platform.AVFoundation.AVAuthorizationStatusNotDetermined
import platform.AVFoundation.AVCaptureDevice
import platform.AVFoundation.AVMediaTypeVideo
import platform.AVFoundation.authorizationStatusForMediaType
import platform.AVFoundation.requestAccessForMediaType
import platform.CoreLocation.CLLocationManager
import platform.CoreLocation.kCLAuthorizationStatusAuthorizedAlways
import platform.CoreLocation.kCLAuthorizationStatusAuthorizedWhenInUse
import platform.CoreLocation.kCLAuthorizationStatusNotDetermined
import platform.Foundation.NSURL
import platform.UIKit.UIApplication
import platform.UIKit.UIApplicationOpenSettingsURLString
import platform.UserNotifications.UNAuthorizationOptionAlert
import platform.UserNotifications.UNAuthorizationOptionBadge
import platform.UserNotifications.UNAuthorizationOptionSound
import platform.UserNotifications.UNAuthorizationStatusAuthorized
import platform.UserNotifications.UNAuthorizationStatusEphemeral
import platform.UserNotifications.UNAuthorizationStatusNotDetermined
import platform.UserNotifications.UNAuthorizationStatusProvisional
import platform.UserNotifications.UNUserNotificationCenter
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

/** iOS only ever shows a permission dialog once: after a refusal the settings app is the only way back. */
@OptIn(ExperimentalForeignApi::class)
class IosPermissionManager : PermissionManager {
    private val locationAuthorization = LocationAuthorization()

    override suspend fun status(permission: AppPermission): PermissionStatus = when (permission) {
        AppPermission.NOTIFICATIONS -> notificationStatus()
        AppPermission.LOCATION -> locationAuthorization.status()
        AppPermission.CAMERA -> cameraStatus()
    }

    override suspend fun request(permission: AppPermission): PermissionStatus {
        when (permission) {
            AppPermission.NOTIFICATIONS -> requestNotifications()
            AppPermission.LOCATION -> locationAuthorization.request()
            AppPermission.CAMERA -> requestCamera()
        }
        return status(permission)
    }

    override fun openSettings(permission: AppPermission) = openSettingsApp()

    override fun isLocationServiceEnabled(): Boolean = CLLocationManager.locationServicesEnabled()

    override fun openLocationServiceSettings() = openSettingsApp()

    private fun openSettingsApp() {
        UIApplication.sharedApplication.openURL(NSURL(string = UIApplicationOpenSettingsURLString))
    }

    private suspend fun notificationStatus(): PermissionStatus = suspendCoroutine { continuation ->
        UNUserNotificationCenter.currentNotificationCenter().getNotificationSettingsWithCompletionHandler { settings ->
            continuation.resume(
                when (settings?.authorizationStatus) {
                    UNAuthorizationStatusAuthorized,
                    UNAuthorizationStatusProvisional,
                    UNAuthorizationStatusEphemeral -> PermissionStatus.GRANTED

                    UNAuthorizationStatusNotDetermined -> PermissionStatus.DENIED
                    else -> PermissionStatus.DENIED_PERMANENTLY
                },
            )
        }
    }

    private suspend fun requestNotifications() {
        suspendCoroutine { continuation ->
            UNUserNotificationCenter.currentNotificationCenter().requestAuthorizationWithOptions(
                UNAuthorizationOptionAlert or UNAuthorizationOptionBadge or UNAuthorizationOptionSound,
            ) { _, _ -> continuation.resume(Unit) }
        }
    }

    private fun cameraStatus(): PermissionStatus =
        when (AVCaptureDevice.authorizationStatusForMediaType(AVMediaTypeVideo)) {
            AVAuthorizationStatusAuthorized -> PermissionStatus.GRANTED
            AVAuthorizationStatusNotDetermined -> PermissionStatus.DENIED
            else -> PermissionStatus.DENIED_PERMANENTLY
        }

    private suspend fun requestCamera() {
        suspendCoroutine { continuation ->
            AVCaptureDevice.requestAccessForMediaType(AVMediaTypeVideo) { _ -> continuation.resume(Unit) }
        }
    }
}

internal fun locationStatusOf(code: Int): PermissionStatus = when (code) {
    kCLAuthorizationStatusAuthorizedAlways,
    kCLAuthorizationStatusAuthorizedWhenInUse -> PermissionStatus.GRANTED

    kCLAuthorizationStatusNotDetermined -> PermissionStatus.DENIED
    else -> PermissionStatus.DENIED_PERMANENTLY
}

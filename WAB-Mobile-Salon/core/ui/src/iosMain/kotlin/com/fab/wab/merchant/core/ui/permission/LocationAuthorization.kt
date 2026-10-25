package com.fab.wab.merchant.core.ui.permission

import kotlinx.cinterop.ExperimentalForeignApi
import platform.CoreLocation.CLLocationManager
import platform.CoreLocation.CLLocationManagerDelegateProtocol
import platform.CoreLocation.kCLAuthorizationStatusNotDetermined
import platform.darwin.NSObject
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

/** Reports the answer to the one-time location dialog, which CoreLocation only delivers to a delegate. */
@OptIn(ExperimentalForeignApi::class)
internal class LocationAuthorization {
    private val manager = CLLocationManager()

    // CoreLocation keeps its delegate weakly, so the strong reference lives here.
    private var delegate: AnswerDelegate? = null

    fun status(): PermissionStatus = locationStatusOf(manager.authorizationStatus)

    suspend fun request() {
        if (manager.authorizationStatus != kCLAuthorizationStatusNotDetermined) return
        suspendCoroutine { continuation ->
            var answered = false
            val answerDelegate = AnswerDelegate { code ->
                if (!answered && code != kCLAuthorizationStatusNotDetermined) {
                    answered = true
                    continuation.resume(Unit)
                }
            }
            delegate = answerDelegate
            manager.delegate = answerDelegate
            manager.requestWhenInUseAuthorization()
        }
        manager.delegate = null
        delegate = null
    }

    private class AnswerDelegate(
        private val onAuthorizationChange: (Int) -> Unit,
    ) : NSObject(), CLLocationManagerDelegateProtocol {
        override fun locationManagerDidChangeAuthorization(manager: CLLocationManager) {
            onAuthorizationChange(manager.authorizationStatus)
        }
    }
}

package com.fab.wab.merchant.core.notification.push

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.internal.synchronized
import kotlinx.coroutines.launch
import kotlin.concurrent.Volatile

private const val NOT_INITIALIZED = "PushNotificationHandler must be initialized before use."

class PushNotificationHandler(
    private val tokenStorage: PushTokenStorage,
    private val onNotificationReceived: ((PushNotification) -> Unit)? = null,
) {
    fun handleNewToken(token: String) {
        CoroutineScope(Dispatchers.Default).launch {
            tokenStorage.savePushToken(token)
        }
    }

    fun handlePushMessage(notification: PushNotification) {
        onNotificationReceived?.invoke(notification)
    }

    companion object {
        @Volatile
        private var instance: PushNotificationHandler? = null

        fun initialize(
            tokenStorage: PushTokenStorage,
            onNotificationReceived: ((PushNotification) -> Unit)? = null,
        ): PushNotificationHandler {
            return instance ?: instance ?: PushNotificationHandler(
                tokenStorage,
                onNotificationReceived
            ).also {
                instance = it
            }
        }

        fun getInstance(): PushNotificationHandler {
            return instance ?: error(NOT_INITIALIZED)
        }
    }
}

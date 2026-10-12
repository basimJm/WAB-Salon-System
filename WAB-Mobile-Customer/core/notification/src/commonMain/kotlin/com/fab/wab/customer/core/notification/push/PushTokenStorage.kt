package com.fab.wab.customer.core.notification.push

interface PushTokenStorage {
    suspend fun savePushToken(token: String)
    suspend fun getPushToken(): String?
}

package com.fab.wab.merchant.core.notification.push

interface PushTokenStorage {
    suspend fun savePushToken(token: String)
    suspend fun getPushToken(): String?
}

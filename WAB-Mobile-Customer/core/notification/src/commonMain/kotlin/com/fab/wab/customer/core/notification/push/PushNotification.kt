package com.fab.wab.customer.core.notification.push

data class PushNotification(
    val title: String,
    val message: String,
    val data: Map<String, String> = emptyMap(),
    val deepLink: String? = null,
)

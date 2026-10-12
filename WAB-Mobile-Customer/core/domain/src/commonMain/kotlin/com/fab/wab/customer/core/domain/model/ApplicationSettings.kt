package com.fab.wab.customer.core.domain.model


import kotlinx.serialization.Serializable

@Serializable
data class ApplicationSettings(
    val appName: String,
    val cashoutMinimumAmount: Double,
    val supportEmail: String,
    val supportPhone: String,
    val walletPercentage: Int,
    val socialLinks: SocialLinks = SocialLinks(),
    val appVersion: String = "1.0.0",
    val forceUpdate: Boolean = false,
    val maintenanceMode: Boolean = false
)

@Serializable
data class SocialLinks(
    val instagram: String? = null,
    val facebook: String? = null,
    val whatsapp: String? = null,
)

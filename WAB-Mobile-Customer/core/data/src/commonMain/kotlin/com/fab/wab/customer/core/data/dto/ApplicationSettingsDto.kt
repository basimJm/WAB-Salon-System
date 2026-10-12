package com.fab.wab.customer.core.data.dto


import com.fab.wab.customer.core.domain.model.ApplicationSettings
import com.fab.wab.customer.core.domain.model.SocialLinks
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ApplicationSettingsDto(
    @SerialName("app_name")
    val appName: String,
    @SerialName("cashout_minimum_amount")
    val cashoutMinimumAmount: Double,
    @SerialName("support_email")
    val supportEmail: String,
    @SerialName("support_phone")
    val supportPhone: String,
    @SerialName("wallet_percentage")
    val walletPercentage: Int,
    @SerialName("social_links")
    val socialLinks: SocialLinksDto? = null,
    @SerialName("app_version")
    val appVersion: String? = null,
    @SerialName("force_update")
    val forceUpdate: Boolean? = null,
    @SerialName("maintenance_mode")
    val maintenanceMode: Boolean? = null
)

@Serializable
data class SocialLinksDto(
    @SerialName("instagram")
    val instagram: String? = null,
    @SerialName("facebook")
    val facebook: String? = null,
    @SerialName("whatsapp")
    val whatsapp: String? = null,
)

fun ApplicationSettingsDto.toDomain(): ApplicationSettings = ApplicationSettings(
    appName = appName,
    cashoutMinimumAmount = cashoutMinimumAmount,
    supportEmail = supportEmail,
    supportPhone = supportPhone,
    walletPercentage = walletPercentage,
    socialLinks = socialLinks?.toDomain() ?: SocialLinks(),
    appVersion = appVersion ?: "1.0.0",
    forceUpdate = forceUpdate ?: false,
    maintenanceMode = maintenanceMode ?: false
)

fun SocialLinksDto.toDomain(): SocialLinks = SocialLinks(
    instagram = instagram,
    facebook = facebook,
    whatsapp = whatsapp,
)

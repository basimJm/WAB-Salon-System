package com.fab.wab.customer.core.data.config

import com.fab.wab.customer.core.data.contract.generated.GetConfigData
import com.fab.wab.customer.core.domain.config.AppConfig
import com.fab.wab.customer.core.domain.config.ContactInfo
import com.fab.wab.customer.core.domain.config.MaintenancePolicy
import com.fab.wab.customer.core.domain.config.OtpConfig
import com.fab.wab.customer.core.domain.config.UpdatePolicy
import com.fab.wab.customer.core.domain.config.UpdateStatus

/** Contract → domain; numbers the contract types as `number` become the integers the UI needs. */
fun GetConfigData.toDomain(): AppConfig = AppConfig(
    update = UpdatePolicy(
        status = UpdateStatus.fromCode(update.status),
        latest = update.latest,
        minSupported = update.minSupported,
        storeUrl = update.storeUrl?.takeIf { it.isNotBlank() },
    ),
    maintenance = MaintenancePolicy(enabled = maintenance.enabled, message = maintenance.message?.takeIf { it.isNotBlank() }),
    nearbyRadiusKm = nearbyRadiusKm,
    otp = OtpConfig(length = otp.length.toInt(), resendAfterSeconds = otp.resendAfterSeconds.toInt()),
    contact = contact?.let { ContactInfo(phone = it.phone, whatsapp = it.whatsapp, email = it.email) },
)

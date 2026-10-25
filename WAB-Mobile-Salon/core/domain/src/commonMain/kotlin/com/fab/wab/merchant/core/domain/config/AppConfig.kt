package com.fab.wab.merchant.core.domain.config

import kotlinx.coroutines.flow.StateFlow
import com.fab.wab.merchant.core.domain.AppResult

/** `GET /merchant/v1/config` (PRD M01, M26): what the app must do with its version. */
enum class UpdateStatus(val code: String) {
    OK("OK"),
    UPDATE_AVAILABLE("UPDATE_AVAILABLE"),
    UPDATE_REQUIRED("UPDATE_REQUIRED"),
    ;

    companion object {
        /** Unknown values never block the app: they read as [OK]. */
        fun fromCode(code: String?): UpdateStatus = entries.firstOrNull { it.code.equals(code, ignoreCase = true) } ?: OK
    }
}

/** The store platform the backend keys its version policy by (`platform` query of the config call). */
enum class ClientPlatform(val code: String) {
    ANDROID("ANDROID"),
    IOS("IOS"),
}

data class UpdatePolicy(
    val status: UpdateStatus,
    val latest: String? = null,
    val minSupported: String? = null,
    val storeUrl: String? = null,
)

data class MaintenancePolicy(
    val enabled: Boolean,
    val message: String? = null,
)

/** OTP length and resend cooldown come from the backend (PRD M03: never hardcode the box count). */
data class OtpConfig(
    val length: Int,
    val resendAfterSeconds: Int,
)

data class ContactInfo(
    val phone: String,
    val whatsapp: String,
    val email: String,
)

data class AppConfig(
    val update: UpdatePolicy,
    val maintenance: MaintenancePolicy,
    val nearbyRadiusKm: Double,
    val otp: OtpConfig,
    val contact: ContactInfo? = null,
)

/** Loaded once at launch (and on retry); features read the last value for OTP, radius and contact. */
interface AppConfigRepository {
    val current: StateFlow<AppConfig?>

    suspend fun refresh(): AppResult<AppConfig>
}

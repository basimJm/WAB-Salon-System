package com.fab.wab.merchant.core.analytics

/** Who is using the app (user type is on every event). */
enum class AnalyticsUserType(val value: String) {
    GUEST("guest"),
    REGISTERED("registered"),
}

/**
 * The common fields attached to every event (PRD §14): user type, language, app version, platform (`android` / `ios`),
 * environment, `app = MERCHANT`, and while signed in the member id, salon id and role.
 */
data class AnalyticsContext(
    val userType: AnalyticsUserType,
    val language: String,
    val appVersion: String,
    val platform: String,
    val environment: String,
    val app: String = AnalyticsApps.MERCHANT,
    val memberId: String? = null,
    val salonId: String? = null,
    val role: String? = null,
) {
    fun toParams(): AnalyticsParams = analyticsParams {
        text(AnalyticsKeys.USER_TYPE, userType.value)
        text(AnalyticsKeys.LANGUAGE, language)
        text(AnalyticsKeys.APP_VERSION, appVersion)
        text(AnalyticsKeys.PLATFORM, platform)
        text(AnalyticsKeys.ENVIRONMENT, environment)
        text(AnalyticsKeys.APP, app)
        memberId?.let { text(AnalyticsKeys.MEMBER_ID, it) }
        salonId?.let { text(AnalyticsKeys.SALON_ID, it) }
        role?.let { text(AnalyticsKeys.ROLE, it) }
    }
}

/**
 * Supplies the current [AnalyticsContext]. Suspending so the app can read it from settings flows;
 * the tracker calls it off the main thread for every event.
 */
fun interface AnalyticsContextProvider {
    suspend fun current(): AnalyticsContext
}

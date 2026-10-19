package com.fab.wab.customer.core.analytics

/** Who is using the app (PRD §14: user type is on every event). */
enum class AnalyticsUserType(val value: String) {
    GUEST("guest"),
    REGISTERED("registered"),
}

/**
 * The common fields attached to every event (PRD §14): user type, gender scope, language, app version, platform.
 * `genderScope` is null until the user has picked a gender; `platform` is `android` / `ios`.
 */
data class AnalyticsContext(
    val userType: AnalyticsUserType,
    val genderScope: String?,
    val language: String,
    val appVersion: String,
    val platform: String,
    val environment: String,
) {
    fun toParams(): AnalyticsParams = analyticsParams {
        text(AnalyticsKeys.USER_TYPE, userType.value)
        genderScope?.let { text(AnalyticsKeys.GENDER_SCOPE, it) }
        text(AnalyticsKeys.LANGUAGE, language)
        text(AnalyticsKeys.APP_VERSION, appVersion)
        text(AnalyticsKeys.PLATFORM, platform)
        text(AnalyticsKeys.ENVIRONMENT, environment)
    }
}

/**
 * Supplies the current [AnalyticsContext]. Suspending so the app can read it from settings flows;
 * the tracker calls it off the main thread for every event.
 */
fun interface AnalyticsContextProvider {
    suspend fun current(): AnalyticsContext
}

package com.fab.wab.customer.core.common

/**
 * Values that differ per build variant (dev/prod, debug/release).
 *
 * The platform entry point builds it from build config (Android `BuildConfig`) or from the
 * environment xcconfig through Info.plist (iOS) and registers it in Koin; shared code never
 * contains an environment value itself.
 */
data class AppEnvironment(
    val name: String,
    val apiBaseUrl: String,
    val appVersion: String,
    val appVersionCode: Int,
    val isDebug: Boolean,
) {
    init {
        require(name.isNotBlank()) { "Environment name must not be blank" }
        require(apiBaseUrl.isNotBlank()) { "API base URL must not be blank for environment '$name'" }
        require(appVersion.isNotBlank()) { "App version must not be blank for environment '$name'" }
        require(appVersionCode >= 0) { "App version code must not be negative" }
    }

    val isDev: Boolean get() = name == AppEnvironmentNames.DEV
    val isProd: Boolean get() = name == AppEnvironmentNames.PROD
}

object AppEnvironmentNames {
    const val DEV = "dev"
    const val PROD = "prod"
}

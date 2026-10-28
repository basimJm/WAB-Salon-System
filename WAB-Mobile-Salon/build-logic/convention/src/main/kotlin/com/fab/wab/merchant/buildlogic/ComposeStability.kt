package com.fab.wab.merchant.buildlogic

import org.gradle.api.Project
import org.gradle.kotlin.dsl.configure
import org.jetbrains.kotlin.compose.compiler.gradle.ComposeCompilerGradlePluginExtension

private const val COMPOSE_STABILITY_FILE = "config/compose-stability.conf"

/** `-PcomposeReports=true` writes the Compose compiler metrics + reports (stability, skippability) per module. */
private const val COMPOSE_REPORTS_PROPERTY = "composeReports"
private const val COMPOSE_REPORTS_DIR = "compose-reports"
private const val CONFIGURED_FLAG = "merchantComposeStabilityConfigured"

/**
 * Applied to every module with the Compose compiler, including the core modules that add the plugin by alias
 * (design-system, ui, navigation, notification), which MER-077 had missed (MER-079 compiler reports).
 * Shared Compose compiler stability configuration (immutable domain models and read-only collections), plus the
 * opt-in compiler reports used by the jetpack-compose-performance audit (MER-079; output in `build/compose-reports`).
 */
internal fun Project.configureComposeStability() {
    // Idempotent: convention plugins call it and the library plugin also reacts to the Compose compiler plugin.
    if (extensions.extraProperties.has(CONFIGURED_FLAG)) return
    extensions.extraProperties.set(CONFIGURED_FLAG, true)
    extensions.configure<ComposeCompilerGradlePluginExtension> {
        stabilityConfigurationFiles.add(rootProject.layout.projectDirectory.file(COMPOSE_STABILITY_FILE))
        if (providers.gradleProperty(COMPOSE_REPORTS_PROPERTY).orNull.toBoolean()) {
            reportsDestination.set(layout.buildDirectory.dir(COMPOSE_REPORTS_DIR))
            metricsDestination.set(layout.buildDirectory.dir(COMPOSE_REPORTS_DIR))
        }
    }
}

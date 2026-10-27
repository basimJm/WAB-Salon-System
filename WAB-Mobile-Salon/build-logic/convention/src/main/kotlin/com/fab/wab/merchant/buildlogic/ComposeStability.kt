package com.fab.wab.merchant.buildlogic

import org.gradle.api.Project
import org.gradle.kotlin.dsl.configure
import org.jetbrains.kotlin.compose.compiler.gradle.ComposeCompilerGradlePluginExtension

private const val COMPOSE_STABILITY_FILE = "config/compose-stability.conf"

/** Shared Compose compiler stability configuration (immutable domain models and read-only collections). */
internal fun Project.configureComposeStability() {
    extensions.configure<ComposeCompilerGradlePluginExtension> {
        stabilityConfigurationFiles.add(rootProject.layout.projectDirectory.file(COMPOSE_STABILITY_FILE))
    }
}

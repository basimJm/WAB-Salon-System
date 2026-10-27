package com.fab.wab.merchant.buildlogic

import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.apply
import org.gradle.kotlin.dsl.configure
import org.jetbrains.kotlin.gradle.dsl.KotlinMultiplatformExtension

class KmpFeaturePresentationPlugin : Plugin<Project> {
    override fun apply(target: Project) {
        with(target) {
            apply(plugin = "com.fab.wab.merchant.kotlin.multiplatform.library")
            apply(plugin = "org.jetbrains.compose")
            apply(plugin = "org.jetbrains.kotlin.plugin.compose")
            configureComposeStability()

            extensions.configure<KotlinMultiplatformExtension> {
                sourceSets.commonMain.dependencies {
                    implementation(libs.findBundle("feature-presentation").get())
                    implementation(project(":core:common"))
                    implementation(project(":core:domain"))
                    implementation(project(":core:ui"))
                    implementation(project(":core:mvi"))
                    implementation(project(":core:analytics"))
                    implementation(project(":core:design-system"))
                    implementation(project(":core:navigation"))
                }
                sourceSets.androidMain.dependencies {
                    implementation(libs.findLibrary("compose-uiToolingPreview").get())
                    implementation(libs.findLibrary("compose-uiTooling").get())
                    implementation(libs.findLibrary("koin-androidx-compose").get())
                }
            }
        }
    }
}

package com.fab.wab.merchant.buildlogic

import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.apply
import org.gradle.kotlin.dsl.configure
import org.jetbrains.kotlin.gradle.dsl.KotlinMultiplatformExtension

class ComposeAppPlugin : Plugin<Project> {
    override fun apply(target: Project) {
        with(target) {
            apply(plugin = "org.jetbrains.kotlin.multiplatform")
            apply(plugin = "com.android.kotlin.multiplatform.library")
            apply(plugin = "org.jetbrains.compose")
            apply(plugin = "org.jetbrains.kotlin.plugin.compose")
            configureComposeStability()
            apply(plugin = "org.jetbrains.kotlin.plugin.serialization")

            extensions.configure<KotlinMultiplatformExtension> {
                jvmToolchain(21)
                configureKotlinQuality(this)

                listOf(iosArm64(), iosSimulatorArm64()).forEach { iosTarget ->
                    iosTarget.binaries.all {
                        freeCompilerArgs += listOf("-Xbinary=bundleId=com.fab.wab.merchant") + IOS_RUNTIME_BINARY_OPTIONS
                    }
                    iosTarget.binaries.framework {
                        baseName = "ComposeApp"
                        isStatic = true
                        // Swift implements the Firebase bridges, so their Kotlin interfaces must be in the framework API.
                        export(project(":core:firebase"))
                    }
                }

                sourceSets.commonMain.dependencies {
                    implementation(project(":core:common"))
                    implementation(project(":core:di"))
                    implementation(project(":core:domain"))
                    implementation(project(":core:storage"))
                    implementation(project(":core:network"))
                    implementation(project(":core:realtime"))
                    implementation(project(":core:data"))
                    implementation(project(":core:navigation"))
                    implementation(project(":core:ui"))
                    implementation(project(":core:mvi"))
                    implementation(project(":core:analytics"))
                    api(project(":core:firebase"))
                    implementation(project(":core:notification"))
                    implementation(project(":core:security"))
                    implementation(project(":core:design-system"))

                    FEATURE_MODULES.forEach { implementation(project(it)) }

                    implementation(libs.findBundle("compose").get())
                    implementation(libs.findLibrary("compose-uiToolingPreview").get())
                    implementation(libs.findLibrary("jetbrains-navigation-compose").get())
                    implementation(libs.findBundle("ktor").get())
                    implementation(libs.findBundle("koin").get())
                    implementation(libs.findBundle("coroutines").get())
                    implementation(libs.findLibrary("kotlinx-serialization-json").get())
                }

                sourceSets.androidMain.dependencies {
                    implementation(libs.findBundle("ktor-android").get())
                    implementation(libs.findBundle("coroutines-android").get())
                    implementation(libs.findBundle("koin-android").get())
                    implementation(libs.findBundle("lifecycle").get())
                }

                sourceSets.iosMain.dependencies {
                    implementation(libs.findBundle("ktor-ios").get())
                }

                sourceSets.commonTest.dependencies {
                    implementation(libs.findLibrary("kotlin-test").get())
                    implementation(libs.findLibrary("kotlinx-coroutines-test").get())
                }
            }

            // Android-specific config (namespace, compileSdk, minSdk) is in
            // composeApp/build.gradle.kts via: kotlin { android { ... } }
        }
    }
}

/** Feature modules compiled into the app shell (add a feature here, in `settings.gradle.kts` and in `App.kt`). */
private val FEATURE_MODULES = listOf(
    ":feature:auth:presentation",
    ":feature:auth:data",
    ":feature:auth:domain",
    ":feature:auth:di",
    ":feature:application:presentation",
    ":feature:application:data",
    ":feature:application:domain",
    ":feature:application:di",
    ":feature:bookings:presentation",
    ":feature:bookings:data",
    ":feature:bookings:domain",
    ":feature:bookings:di",
    ":feature:salon:presentation",
    ":feature:salon:data",
    ":feature:salon:domain",
    ":feature:salon:di",
    ":feature:team:presentation",
    ":feature:team:data",
    ":feature:team:domain",
    ":feature:team:di",
    ":feature:finance:presentation",
    ":feature:finance:data",
    ":feature:finance:domain",
    ":feature:finance:di",
    ":feature:notifications:presentation",
    ":feature:notifications:data",
    ":feature:notifications:domain",
    ":feature:notifications:di",
    ":feature:content:presentation",
    ":feature:content:data",
    ":feature:content:domain",
    ":feature:content:di",
    ":feature:more:presentation",
    ":feature:more:data",
    ":feature:more:domain",
    ":feature:more:di",
    ":feature:branches:presentation",
    ":feature:home:presentation",
    ":feature:home:data",
    ":feature:home:domain",
    ":feature:home:di",
    ":feature:insights:presentation",
    ":feature:insights:data",
    ":feature:insights:domain",
    ":feature:insights:di",
)

/**
 * Kotlin/Native runtime options for the app framework (MER-078, iOS performance).
 * `appStateTracking`: the GC follows the app state and stops its timer-driven collections in the background,
 * so a foregrounded app does not pay for background GC work (Kotlin/Native memory-management docs).
 * The default concurrent mark-and-sweep GC (`gc=cms`) stays; `objcDisposeOnMain` keeps its default `true`
 * because Compose holds UIKit objects that must be released on the main thread.
 */
private val IOS_RUNTIME_BINARY_OPTIONS = listOf("-Xbinary=appStateTracking=enabled")

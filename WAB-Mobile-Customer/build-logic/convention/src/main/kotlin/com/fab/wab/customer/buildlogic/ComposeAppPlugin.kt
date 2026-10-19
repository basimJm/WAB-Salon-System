package com.fab.wab.customer.buildlogic

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
            apply(plugin = "org.jetbrains.kotlin.plugin.serialization")

            extensions.configure<KotlinMultiplatformExtension> {
                jvmToolchain(21)
                configureKotlinQuality(this)

                listOf(iosArm64(), iosSimulatorArm64()).forEach { iosTarget ->
                    iosTarget.binaries.all {
                        freeCompilerArgs += listOf("-Xbinary=bundleId=com.fab.wab.customer")
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

                    implementation(project(":feature:sample:presentation"))
                    implementation(project(":feature:sample:data"))
                    implementation(project(":feature:sample:domain"))
                    implementation(project(":feature:sample:di"))
                    implementation(project(":feature:onboarding:presentation"))
                    implementation(project(":feature:onboarding:domain"))
                    implementation(project(":feature:onboarding:di"))
                    implementation(project(":feature:auth:presentation"))
                    implementation(project(":feature:auth:domain"))
                    implementation(project(":feature:auth:di"))
                    implementation(project(":feature:home:presentation"))
                    implementation(project(":feature:home:domain"))
                    implementation(project(":feature:home:di"))
                    implementation(project(":feature:salons:presentation"))
                    implementation(project(":feature:salons:domain"))
                    implementation(project(":feature:salons:di"))
                    implementation(project(":feature:salon:presentation"))
                    implementation(project(":feature:salon:domain"))
                    implementation(project(":feature:salon:di"))
                    implementation(project(":feature:favorites:presentation"))
                    implementation(project(":feature:favorites:domain"))
                    implementation(project(":feature:favorites:di"))
                    implementation(project(":feature:bookings:presentation"))
                    implementation(project(":feature:bookings:domain"))
                    implementation(project(":feature:bookings:di"))

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

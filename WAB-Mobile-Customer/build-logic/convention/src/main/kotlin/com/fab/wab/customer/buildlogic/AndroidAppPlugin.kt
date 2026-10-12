package com.fab.wab.customer.buildlogic

import com.android.build.api.dsl.ApplicationExtension
import org.gradle.api.JavaVersion
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.apply
import org.gradle.kotlin.dsl.configure
import org.gradle.kotlin.dsl.dependencies
import java.util.Properties

class AndroidAppPlugin : Plugin<Project> {
    override fun apply(target: Project) {
        with(target) {
            apply(plugin = "com.android.application")
            apply(plugin = "org.jetbrains.compose")
            apply(plugin = "org.jetbrains.kotlin.plugin.compose")
            apply(plugin = "com.google.gms.google-services")

            val localProperties = Properties()
            val localPropertiesFile = rootProject.file("local.properties")
            if (localPropertiesFile.exists()) {
                localPropertiesFile.inputStream().use { localProperties.load(it) }
            }
            val mapsApiKey = localProperties.getProperty("MAPS_API_KEY") ?: ""

            extensions.configure<ApplicationExtension> {
                namespace = "com.fab.wab.customer"
                compileSdk = 36
                defaultConfig {
                    applicationId = "com.fab.wab.customer"
                    minSdk = 26
                    targetSdk = 36
                    versionCode = 1
                    versionName = "1.0"
                    
                    manifestPlaceholders["MAPS_API_KEY"] = mapsApiKey
                }
                buildTypes.getByName("release") {
                    isMinifyEnabled = false
                }
                packaging {
                    resources {
                        excludes += "/META-INF/{AL2.0,LGPL2.1}"
                    }
                }
                buildFeatures {
                    buildConfig = true
                }
                compileOptions {
                    sourceCompatibility = JavaVersion.VERSION_21
                    targetCompatibility = JavaVersion.VERSION_21
                }
            }

            dependencies {
                add("implementation", project(":composeApp"))
                add("implementation", project(":core:data"))
                add("implementation", project(":core:domain"))
                add("implementation", project(":core:storage"))
                add("implementation", libs.findLibrary("androidx-activity-compose").get())
                add("implementation", libs.findBundle("koin-android").get())
                add("implementation", libs.findBundle("lifecycle").get())
                add("implementation", libs.findLibrary("firebase-messaging").get())
                add("debugImplementation", libs.findLibrary("compose-uiTooling").get())
            }
        }
    }
}

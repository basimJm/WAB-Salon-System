pluginManagement {
    includeBuild("build-logic")
    repositories {
        google {
            mavenContent {
                includeGroupAndSubgroups("androidx")
                includeGroupAndSubgroups("com.android")
                includeGroupAndSubgroups("com.google")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "0.10.0"
}

rootProject.name = "Merchant"
enableFeaturePreview("TYPESAFE_PROJECT_ACCESSORS")

dependencyResolutionManagement {
    repositories {
        google {
            mavenContent {
                includeGroupAndSubgroups("androidx")
                includeGroupAndSubgroups("com.android")
                includeGroupAndSubgroups("com.google")
            }
        }
        mavenCentral()
    }
}

include(
    ":androidApp",
    ":composeApp",
    ":core:common",
    ":core:di",
    ":core:domain",
    ":core:storage",
    ":core:network",
    ":core:realtime",
    ":core:data",
    ":core:navigation",
    ":core:ui",
    ":core:mvi",
    ":core:analytics",
    ":core:firebase",
    ":core:notification",
    ":core:security",
    ":core:design-system",
    ":feature:auth:domain",
    ":feature:auth:data",
    ":feature:auth:presentation",
    ":feature:auth:di",
    ":feature:application:domain",
    ":feature:application:data",
    ":feature:application:presentation",
    ":feature:application:di",
    ":feature:bookings:domain",
    ":feature:bookings:data",
    ":feature:bookings:presentation",
    ":feature:bookings:di",
    ":feature:salon:domain",
    ":feature:salon:data",
    ":feature:salon:presentation",
    ":feature:salon:di",
    ":feature:sample:domain",
    ":feature:sample:data",
    ":feature:sample:presentation",
    ":feature:sample:di",
)

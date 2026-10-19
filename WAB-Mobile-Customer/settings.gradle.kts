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

rootProject.name = "WABCustomer"
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
    ":feature:sample:domain",
    ":feature:sample:data",
    ":feature:sample:presentation",
    ":feature:sample:di",
    ":feature:onboarding:domain",
    ":feature:onboarding:presentation",
    ":feature:onboarding:di",
    ":feature:auth:domain",
    ":feature:auth:data",
    ":feature:auth:presentation",
    ":feature:auth:di",
    ":feature:home:domain",
    ":feature:home:data",
    ":feature:home:presentation",
    ":feature:home:di",
    ":feature:salons:domain",
    ":feature:salons:data",
    ":feature:salons:presentation",
    ":feature:salons:di",
    ":feature:salon:domain",
    ":feature:salon:data",
    ":feature:salon:presentation",
    ":feature:salon:di",
    ":feature:favorites:domain",
    ":feature:favorites:presentation",
    ":feature:favorites:di",
    ":feature:bookings:domain",
    ":feature:bookings:data",
    ":feature:bookings:presentation",
    ":feature:bookings:di",
    ":feature:notifications:domain",
    ":feature:notifications:data",
    ":feature:notifications:presentation",
    ":feature:notifications:di",
    ":feature:booking:domain",
    ":feature:booking:data",
    ":feature:booking:presentation",
    ":feature:booking:di",
)

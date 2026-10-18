pluginManagement {
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
        // HyperPay mobile SDK repository (URL supplied by the owner, see gradle.properties).
        providers.gradleProperty("wab.payments.oppwa.repository").orNull?.takeIf { it.isNotBlank() }?.let { url ->
            maven { setUrl(url) }
        }
    }
}

rootProject.name = "wab-payments-kmp"

include(":payments")

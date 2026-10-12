plugins {
    alias(libs.plugins.com.fab.wab.customer.kotlin.multiplatform.library)
    alias(libs.plugins.kotlinSerialization)
}

kotlin {
    android {
        namespace = "com.fab.wab.customer.core.data"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.core.domain)
        implementation(projects.core.storage)
        implementation(projects.core.network)
        implementation(libs.bundles.network)
        implementation(projects.core.ui)
        implementation(libs.koin.core)
        implementation(libs.paging.compose.common)
        implementation(libs.paging.common)
        implementation(libs.kotlinx.serialization.json)
    }
    sourceSets.androidMain.dependencies {
        implementation(libs.play.services.location)
    }
}
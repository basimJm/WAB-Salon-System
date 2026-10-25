plugins {
    alias(libs.plugins.com.fab.wab.merchant.kotlin.multiplatform.library)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.core.di"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(libs.bundles.coroutines)
        implementation(libs.koin.core)
        implementation(projects.core.storage)
        implementation(projects.core.network)
        implementation(projects.core.data)
        implementation(projects.core.domain)
        implementation(projects.core.ui)
    }
    sourceSets.androidMain.dependencies {
        implementation(libs.koin.androidx.compose)
    }
}

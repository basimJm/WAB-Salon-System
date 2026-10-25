plugins {
    alias(libs.plugins.com.fab.wab.merchant.feature.di)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.feature.auth.di"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.auth.domain)
        implementation(projects.feature.auth.data)
        implementation(projects.core.domain)
        implementation(libs.kotlinx.coroutines.core)
    }
}

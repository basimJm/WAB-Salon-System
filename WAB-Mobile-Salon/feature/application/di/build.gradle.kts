plugins {
    alias(libs.plugins.com.fab.wab.merchant.feature.di)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.feature.application.di"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.application.domain)
        implementation(projects.feature.application.data)
        implementation(projects.feature.auth.domain)
        implementation(projects.core.domain)
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlinx.coroutines.test)
    }
}

plugins {
    alias(libs.plugins.com.fab.wab.merchant.feature.domain)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.feature.application.domain"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.auth.domain)
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlinx.coroutines.test)
    }
}

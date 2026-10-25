plugins {
    alias(libs.plugins.com.fab.wab.merchant.feature.data)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.feature.application.data"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.application.domain)
        implementation(projects.feature.auth.domain)
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlinx.coroutines.test)
    }
}

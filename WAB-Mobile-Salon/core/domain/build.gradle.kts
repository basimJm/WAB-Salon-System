plugins {
    alias(libs.plugins.com.fab.wab.merchant.kotlin.multiplatform.library)
    alias(libs.plugins.kotlinSerialization)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.core.domain"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(libs.bundles.coroutines)
        implementation(libs.kotlinx.serialization.json)
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlin.test)
        implementation(libs.kotlinx.coroutines.test)
    }
}

plugins {
    alias(libs.plugins.com.fab.wab.merchant.kotlin.multiplatform.library)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.core.common"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(libs.bundles.coroutines)
        implementation(libs.kotlinx.datetime)
    }
}

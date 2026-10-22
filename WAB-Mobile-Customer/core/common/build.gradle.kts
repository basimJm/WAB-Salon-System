plugins {
    alias(libs.plugins.com.fab.wab.customer.kotlin.multiplatform.library)
}

kotlin {
    android {
        namespace = "com.fab.wab.customer.core.common"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(libs.bundles.coroutines)
        implementation(libs.kotlinx.datetime)
    }
}

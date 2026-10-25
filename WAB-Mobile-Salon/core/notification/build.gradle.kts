plugins {
    alias(libs.plugins.com.fab.wab.merchant.kotlin.multiplatform.library)
    alias(libs.plugins.composeMultiplatform)
    alias(libs.plugins.composeCompiler)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.core.notification"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(libs.bundles.compose)
        implementation(libs.bundles.coroutines)
        implementation(libs.bundles.lifecycle)
        implementation(libs.bundles.koin)
    }
}

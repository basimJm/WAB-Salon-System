plugins {
    alias(libs.plugins.com.fab.wab.customer.kotlin.multiplatform.library)
    alias(libs.plugins.composeMultiplatform)
    alias(libs.plugins.composeCompiler)
}

kotlin {
    android {
        namespace = "com.fab.wab.customer.core.ui"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(libs.bundles.coroutines)
        implementation(libs.bundles.lifecycle)
        implementation(libs.compose.runtime)
        implementation(libs.compose.foundation)
        implementation(libs.koin.core)
        api(projects.core.notification)
    }
}

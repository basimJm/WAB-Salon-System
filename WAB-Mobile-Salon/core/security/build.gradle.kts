plugins {
    alias(libs.plugins.com.fab.wab.merchant.kotlin.multiplatform.library)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.core.security"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
}

plugins {
    alias(libs.plugins.com.fab.wab.merchant.feature.domain)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.feature.auth.domain"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
}

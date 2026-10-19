plugins {
    alias(libs.plugins.com.fab.wab.customer.feature.domain)
}

kotlin {
    android {
        namespace = "com.fab.wab.customer.feature.onboarding.domain"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
}

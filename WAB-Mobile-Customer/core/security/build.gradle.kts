plugins {
    alias(libs.plugins.com.fab.wab.customer.kotlin.multiplatform.library)
}

kotlin {
    android {
        namespace = "com.fab.wab.customer.core.security"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
}

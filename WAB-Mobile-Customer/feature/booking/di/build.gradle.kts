plugins {
    alias(libs.plugins.com.fab.wab.customer.feature.di)
}

kotlin {
    android {
        namespace = "com.fab.wab.customer.feature.booking.di"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.booking.domain)
        implementation(projects.feature.booking.data)
        implementation(projects.core.domain)
    }
}

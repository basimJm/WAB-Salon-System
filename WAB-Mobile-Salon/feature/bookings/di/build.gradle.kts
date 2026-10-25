plugins {
    alias(libs.plugins.com.fab.wab.merchant.feature.di)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.feature.bookings.di"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.bookings.domain)
        implementation(projects.feature.bookings.data)
        implementation(projects.core.domain)
        implementation(projects.core.realtime)
        implementation(libs.kotlinx.datetime)
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlinx.coroutines.test)
    }
}

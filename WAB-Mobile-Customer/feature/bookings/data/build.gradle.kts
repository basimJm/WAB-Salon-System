plugins {
    alias(libs.plugins.com.fab.wab.customer.feature.data)
}

kotlin {
    android {
        namespace = "com.fab.wab.customer.feature.bookings.data"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.bookings.domain)
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlinx.coroutines.test)
        implementation(libs.ktor.client.mock)
    }
}

plugins {
    alias(libs.plugins.com.fab.wab.merchant.feature.data)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.feature.notifications.data"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.notifications.domain)
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlinx.coroutines.test)
        implementation(libs.ktor.client.mock)
    }
}

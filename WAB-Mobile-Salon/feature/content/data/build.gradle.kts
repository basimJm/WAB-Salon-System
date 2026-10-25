plugins {
    alias(libs.plugins.com.fab.wab.merchant.feature.data)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.feature.content.data"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.content.domain)
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlinx.coroutines.test)
        implementation(libs.ktor.client.mock)
    }
}
